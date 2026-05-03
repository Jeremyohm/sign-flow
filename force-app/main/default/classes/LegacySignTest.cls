@isTest
private class LegacySignTest {

    @isTest
    static void testCallbackCompleted() {
        Id estateRt = Schema.SObjectType.Opportunity.getRecordTypeInfosByDeveloperName()
            .get('Estate_Sale').getRecordTypeId();

        Contact dirContact = new Contact(FirstName = 'Test', LastName = 'Director', Email = 'dir@example.com', Relationship__c = 'Family');
        insert dirContact;

        Opportunity opp = new Opportunity(
            Name = 'Test Estate Sale',
            StageName = 'Pending Signature',
            CloseDate = Date.today().addDays(30),
            RecordTypeId = estateRt,
            Skip_Flow_Data_Loader__c = true,
            RE_DD_Director_of_Acquisition_Contact__c = dirContact.Id
        );
        insert opp;

        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/LegacySignCallback';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'event' => 'envelope.completed',
            'envelope_id' => 'test-envelope-uuid',
            'sf_opportunity_id' => opp.Id,
            'completed_at' => Datetime.now().formatGmt('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
        }));

        RestResponse res = new RestResponse();
        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        LegacySignCallback.handleCallback();
        Test.stopTest();

        System.assertEquals(200, res.statusCode);

        Opportunity updated = [SELECT StageName FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals('Approved', updated.StageName);
    }

    @isTest
    static void testCallbackIgnoresNonCompletedEvent() {
        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/LegacySignCallback';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf('{"event":"envelope.viewed","envelope_id":"test"}');

        RestResponse res = new RestResponse();
        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        LegacySignCallback.handleCallback();
        Test.stopTest();

        System.assertEquals(200, res.statusCode);
        System.assert(res.responseBody.toString().contains('ignored'));
    }

    @isTest
    static void testCallbackMissingOppId() {
        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/LegacySignCallback';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf('{"event":"envelope.completed","envelope_id":"test"}');

        RestResponse res = new RestResponse();
        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        LegacySignCallback.handleCallback();
        Test.stopTest();

        System.assertEquals(400, res.statusCode);
    }

    @isTest
    static void testCalloutFuture() {
        Id estateRt = Schema.SObjectType.Opportunity.getRecordTypeInfosByDeveloperName()
            .get('Estate_Sale').getRecordTypeId();

        Opportunity opp = new Opportunity(
            Name = 'Test Estate Sale Callout',
            StageName = 'In Pursuit',
            CloseDate = Date.today().addDays(30),
            RecordTypeId = estateRt,
            Left_Main__Full_Address__c = '123 Test St, San Diego, CA 92101',
            CP_Reason_for_Seeking_Care_Services__c = 'Furniture\nAntiques\nJewelry'
        );
        insert opp;

        Test.setMock(HttpCalloutMock.class, new LegacySignMock());

        Test.startTest();
        LegacySignCallout.sendForSigning(new Set<Id>{ opp.Id });
        Test.stopTest();
    }

    @isTest
    static void testTriggerFiresOnStageChange() {
        Id estateRt = Schema.SObjectType.Opportunity.getRecordTypeInfosByDeveloperName()
            .get('Estate_Sale').getRecordTypeId();

        Opportunity opp = new Opportunity(
            Name = 'Test Trigger Fire',
            StageName = 'In Pursuit',
            CloseDate = Date.today().addDays(30),
            RecordTypeId = estateRt,
            Skip_Flow_Data_Loader__c = true
        );
        insert opp;

        Test.setMock(HttpCalloutMock.class, new LegacySignMock());

        Test.startTest();
        opp.StageName = 'Pending Signature';
        update opp;
        Test.stopTest();
    }

    private class LegacySignMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(201);
            res.setBody('{"envelope_id":"mock-uuid","status":"sent","signers":[]}');
            return res;
        }
    }
}
