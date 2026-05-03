/**
 * LegacySignCallout — Sends Estate Sale Agreement for signing via Legacy Sign.
 * Called from LegacySignTrigger when Opportunity stage changes to "Pending Signature"
 * on Estate_Sale record type.
 *
 * Uses @future(callout=true) because triggers cannot make HTTP callouts synchronously.
 * API key stored in Custom Label: LegacySign_API_Key
 */
public class LegacySignCallout {

    private static final String TEMPLATE_ID = 'dfae483f-e2f9-4341-8133-82819a1c98f5';
    private static final String ENDPOINT = 'https://tlh-legacy-sign.pages.dev/api/v1/sf-webhook';
    private static final String CALLBACK_URL = 'https://truelegacyhomes2.my.salesforce.com/services/apexrest/LegacySignCallback';

    @future(callout=true)
    public static void sendForSigning(Set<Id> opportunityIds) {
        List<Opportunity> opps = [
            SELECT Id, Name, Address__c, Left_Main__Full_Address__c,
                   Primary_Contact_First_Name__c, Primary_Contact_Email__c,
                   CP_Reason_for_Seeking_Care_Services__c,
                   OwnerId, Owner.Name, Owner.Email
            FROM Opportunity
            WHERE Id IN :opportunityIds
        ];

        String apiKey = Label.LegacySign_API_Key;
        if (!Test.isRunningTest() && (String.isBlank(apiKey) || apiKey == 'PLACEHOLDER')) {
            System.debug(LoggingLevel.ERROR, 'LegacySignCallout: API key not configured in Custom Label LegacySign_API_Key');
            return;
        }

        for (Opportunity opp : opps) {
            try {
                callLegacySign(opp, apiKey);
            } catch (Exception ex) {
                System.debug(LoggingLevel.ERROR, 'LegacySignCallout failed for ' + opp.Id + ': ' + ex.getMessage());
            }
        }
    }

    private static void callLegacySign(Opportunity opp, String apiKey) {
        List<Map<String, String>> signers = new List<Map<String, String>>();

        // Signer 1: TLES Representative (Opportunity owner)
        signers.add(new Map<String, String>{
            'name' => opp.Owner.Name,
            'email' => opp.Owner.Email,
            'role' => 'Signer'
        });

        // Signer 2: Client (from formula fields)
        if (String.isNotBlank(opp.Primary_Contact_Email__c)) {
            String clientName = String.isNotBlank(opp.Primary_Contact_First_Name__c)
                ? opp.Primary_Contact_First_Name__c : 'Client';
            signers.add(new Map<String, String>{
                'name' => clientName,
                'email' => opp.Primary_Contact_Email__c,
                'role' => 'Signer'
            });
        }

        // CC: Peter Ohm
        signers.add(new Map<String, String>{
            'name' => 'Peter Ohm',
            'email' => 'peter.ohm@truelegacyhomes.com',
            'role' => 'CC'
        });

        // Parse key items
        List<String> keyItems = new List<String>();
        if (String.isNotBlank(opp.CP_Reason_for_Seeking_Care_Services__c)) {
            for (String line : opp.CP_Reason_for_Seeking_Care_Services__c.split('\n')) {
                String trimmed = line.trim();
                if (String.isNotBlank(trimmed)) {
                    keyItems.add(trimmed);
                }
            }
        }

        String address = String.isNotBlank(opp.Address__c)
            ? opp.Address__c
            : (String.isNotBlank(opp.Left_Main__Full_Address__c) ? opp.Left_Main__Full_Address__c : '');

        Map<String, Object> payload = new Map<String, Object>{
            'template_id' => TEMPLATE_ID,
            'sf_opportunity_id' => opp.Id,
            'opportunity_name' => opp.Name,
            'signers' => signers,
            'key_items' => keyItems,
            'callback_url' => CALLBACK_URL
        };

        if (String.isNotBlank(address)) {
            List<Map<String, Object>> fieldValues = new List<Map<String, Object>>();
            fieldValues.add(new Map<String, Object>{
                'page' => 0, 'x' => 140, 'y' => 148, 'w' => 300, 'h' => 14,
                'value' => address
            });
            payload.put('field_values', fieldValues);
        }

        HttpRequest req = new HttpRequest();
        req.setEndpoint(ENDPOINT);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('X-API-Key', apiKey);
        req.setBody(JSON.serialize(payload));
        req.setTimeout(30000);

        HttpResponse res = new Http().send(req);

        if (res.getStatusCode() == 201) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            String envelopeId = (String) result.get('envelope_id');
            System.debug('LegacySign envelope created: ' + envelopeId + ' for Opp ' + opp.Id);
        } else {
            System.debug(LoggingLevel.ERROR, 'LegacySign callout failed: HTTP ' + res.getStatusCode() + ' — ' + res.getBody());
        }
    }
}
