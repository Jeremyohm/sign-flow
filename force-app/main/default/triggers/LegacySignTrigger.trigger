/**
 * LegacySignTrigger — Fires when an Estate Sale Opportunity moves to "Pending Signature".
 * Enqueues an async callout to Legacy Sign to create and send the signing envelope.
 */
trigger LegacySignTrigger on Opportunity (after update) {

    Set<Id> oppIds = new Set<Id>();

    for (Opportunity opp : Trigger.new) {
        Opportunity old = Trigger.oldMap.get(opp.Id);

        // Only fire when stage changes TO "Pending Signature"
        if (opp.StageName == 'Pending Signature' && old.StageName != 'Pending Signature') {
            // Filter to Estate Sale record type
            if (opp.RecordTypeId == Schema.SObjectType.Opportunity.getRecordTypeInfosByDeveloperName()
                    .get('Estate_Sale').getRecordTypeId()) {
                oppIds.add(opp.Id);
            }
        }
    }

    if (!oppIds.isEmpty()) {
        LegacySignCallout.sendForSigning(oppIds);
    }
}
