/**
 * LegacySignCallback — REST endpoint that receives signing completion events from Legacy Sign.
 * POST /services/apexrest/LegacySignCallback
 *
 * When all signers complete, Legacy Sign POSTs:
 * {
 *   "event": "envelope.completed",
 *   "envelope_id": "uuid",
 *   "sf_opportunity_id": "006...",
 *   "completed_at": "2026-04-15T14:30:00.000Z"
 * }
 *
 * This moves the Opportunity from "Pending Signature" to "Approved".
 */
@RestResource(urlMapping='/LegacySignCallback')
global class LegacySignCallback {

    @HttpPost
    global static void handleCallback() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

            String event = (String) body.get('event');
            String envelopeId = (String) body.get('envelope_id');
            String sfOppId = (String) body.get('sf_opportunity_id');
            String completedAt = (String) body.get('completed_at');

            if (event != 'envelope.completed') {
                res.statusCode = 200;
                res.responseBody = Blob.valueOf('{"status":"ignored","reason":"event not envelope.completed"}');
                return;
            }

            if (String.isBlank(sfOppId)) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf('{"error":"sf_opportunity_id is required"}');
                return;
            }

            // Validate it's a real Opportunity
            List<Opportunity> opps = [
                SELECT Id, StageName, RecordType.DeveloperName
                FROM Opportunity
                WHERE Id = :sfOppId
                LIMIT 1
            ];

            if (opps.isEmpty()) {
                res.statusCode = 404;
                res.responseBody = Blob.valueOf('{"error":"Opportunity not found"}');
                return;
            }

            Opportunity opp = opps[0];

            // Only advance if currently at "Pending Signature"
            if (opp.StageName == 'Pending Signature') {
                opp.StageName = 'Approved';
                update opp;
            }

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(
                '{"status":"ok","opportunity_id":"' + sfOppId +
                '","new_stage":"' + opp.StageName +
                '","envelope_id":"' + envelopeId + '"}'
            );

        } catch (Exception ex) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf('{"error":"' + ex.getMessage().escapeJava() + '"}');
        }
    }
}
