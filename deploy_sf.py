"""
Deploy Legacy Sign SF integration (Apex + Trigger) to Salesforce.

Components:
  - LegacySignCallout.cls      — @future callout to Legacy Sign webhook
  - LegacySignCallback.cls     — @RestResource for completion callback
  - LegacySignTrigger.trigger  — Fires on Opportunity stage → "Pending Signature"
  - LegacySignTest.cls         — Test class (5 tests)
  - LegacySign_API_Key         — Custom Label for API key storage

Usage:
  python deploy_sf.py              # Deploy to production
  python deploy_sf.py --sandbox    # Deploy to sandbox
"""

import os
import io
import sys
import time
import zipfile
import base64
from pathlib import Path
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────
_WIN_ONEDRIVE = Path(r"C:\Users\couge\OneDrive - Intellismart Global Staffing LLC\TLH AI")
_WIN_DROPBOX = Path(r"C:\Users\couge\True Legacy Homes Dropbox\Peter Ohm\AI Projects\AI Projects")

for _p in [_WIN_DROPBOX, _WIN_ONEDRIVE]:
    if _p.exists() and (_p / "Fund Tracker" / "SF API").exists():
        _BASE = _p
        break
else:
    _BASE = _WIN_ONEDRIVE

ENV_DIR = _BASE / "Fund Tracker" / "SF API"
PROJECT_ROOT = Path(__file__).parent / "force-app" / "main" / "default"

POLL_INTERVAL = 5
MAX_POLL = 120


# ── 1. Connect to Salesforce ────────────────────────────────────
def connect():
    env_file = ".env.sandbox" if "--sandbox" in sys.argv else ".env"
    load_dotenv(ENV_DIR / env_file)
    import requests as req

    domain = os.getenv("SF_DOMAIN")
    token_url = f"https://{domain}.salesforce.com/services/oauth2/token"

    resp = req.post(token_url, data={
        "grant_type": "client_credentials",
        "client_id": os.getenv("SF_CONSUMER_KEY"),
        "client_secret": os.getenv("SF_CONSUMER_SECRET"),
    }, timeout=30)

    if resp.status_code != 200:
        print(f"Token request failed (HTTP {resp.status_code}): {resp.text}")
        sys.exit(1)

    token_data = resp.json()
    from simple_salesforce import Salesforce
    sf = Salesforce(instance_url=token_data["instance_url"], session_id=token_data["access_token"])
    print(f"Connected to Salesforce ({token_data['instance_url']})")
    return sf


# ── 2. Build deployment ZIP ──────────────────────────────────────
def build_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("package.xml", PACKAGE_XML)

        # Apex classes
        for cls_name in ["LegacySignCallout", "LegacySignCallback", "LegacySignTest"]:
            cls_file = PROJECT_ROOT / "classes" / f"{cls_name}.cls"
            meta_file = PROJECT_ROOT / "classes" / f"{cls_name}.cls-meta.xml"
            zf.write(cls_file, f"classes/{cls_name}.cls")
            zf.write(meta_file, f"classes/{cls_name}.cls-meta.xml")

        # Trigger
        trg_file = PROJECT_ROOT / "triggers" / "LegacySignTrigger.trigger"
        trg_meta = PROJECT_ROOT / "triggers" / "LegacySignTrigger.trigger-meta.xml"
        zf.write(trg_file, "triggers/LegacySignTrigger.trigger")
        zf.write(trg_meta, "triggers/LegacySignTrigger.trigger-meta.xml")

        # Custom Label metadata
        zf.writestr(CUSTOM_LABEL_PATH, CUSTOM_LABEL_XML)

        # Remote Site Setting (allows callout to Legacy Sign)
        zf.writestr(REMOTE_SITE_PATH, REMOTE_SITE_XML)

    buf.seek(0)
    print(f"Built deployment ZIP ({buf.getbuffer().nbytes:,} bytes)")
    return buf


# ── 3. Deploy via Metadata API ───────────────────────────────────
def deploy(sf, zip_buf):
    zip_b64 = base64.b64encode(zip_buf.read()).decode("utf-8")

    deploy_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soap:Header>
    <met:SessionHeader>
      <met:sessionId>{sf.session_id}</met:sessionId>
    </met:SessionHeader>
  </soap:Header>
  <soap:Body>
    <met:deploy>
      <met:ZipFile>{zip_b64}</met:ZipFile>
      <met:DeployOptions>
        <met:rollbackOnError>true</met:rollbackOnError>
        <met:singlePackage>true</met:singlePackage>
        <met:testLevel>RunSpecifiedTests</met:testLevel>
        <met:runTests>LegacySignTest</met:runTests>
      </met:DeployOptions>
    </met:deploy>
  </soap:Body>
</soap:Envelope>"""

    import requests
    url = f"https://{sf.sf_instance}/services/Soap/m/59.0"
    headers = {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": "deploy"}
    resp = requests.post(url, data=deploy_xml, headers=headers)

    if resp.status_code != 200:
        print(f"Deploy request failed: HTTP {resp.status_code}")
        print(resp.text[:2000])
        sys.exit(1)

    import xml.etree.ElementTree as ET
    root = ET.fromstring(resp.text)
    ns = {"soap": "http://schemas.xmlsoap.org/soap/envelope/", "met": "http://soap.sforce.com/2006/04/metadata"}
    id_elem = root.find(".//met:id", ns)
    if id_elem is None:
        print("Could not extract deployment ID:")
        print(resp.text[:2000])
        sys.exit(1)

    deploy_id = id_elem.text
    print(f"Deployment started: {deploy_id}")
    return deploy_id


# ── 4. Poll status ──────────────────────────────────────────────
def poll_status(sf, deploy_id):
    import requests
    import xml.etree.ElementTree as ET
    ns = {"soap": "http://schemas.xmlsoap.org/soap/envelope/", "met": "http://soap.sforce.com/2006/04/metadata"}
    url = f"https://{sf.sf_instance}/services/Soap/m/59.0"
    elapsed = 0

    while elapsed < MAX_POLL:
        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

        check_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soap:Header><met:SessionHeader><met:sessionId>{sf.session_id}</met:sessionId></met:SessionHeader></soap:Header>
  <soap:Body><met:checkDeployStatus>
    <met:asyncProcessId>{deploy_id}</met:asyncProcessId>
    <met:includeDetails>true</met:includeDetails>
  </met:checkDeployStatus></soap:Body>
</soap:Envelope>"""

        headers = {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": "checkDeployStatus"}
        resp = requests.post(url, data=check_xml, headers=headers)
        root = ET.fromstring(resp.text)

        done = root.find(".//met:done", ns)
        status = root.find(".//met:status", ns)
        done_val = done.text if done is not None else "?"
        status_val = status.text if status is not None else "?"
        print(f"  [{elapsed}s] status={status_val}, done={done_val}")

        if done_val == "true":
            return root, ns

    print(f"Timed out after {MAX_POLL}s")
    sys.exit(1)


# ── 5. Print results ────────────────────────────────────────────
def print_results(root, ns):
    result = root.find(".//met:result", ns)
    status = result.find("met:status", ns)
    success = result.find("met:success", ns)
    num_comp = result.find("met:numberComponentsDeployed", ns)
    num_err = result.find("met:numberComponentErrors", ns)
    num_test_run = result.find("met:numberTestsCompleted", ns)
    num_test_err = result.find("met:numberTestErrors", ns)

    print("\n" + "=" * 60)
    print(f"  Status:              {status.text if status is not None else '?'}")
    print(f"  Success:             {success.text if success is not None else '?'}")
    print(f"  Components Deployed: {num_comp.text if num_comp is not None else '?'}")
    print(f"  Component Errors:    {num_err.text if num_err is not None else '?'}")
    print(f"  Tests Run:           {num_test_run.text if num_test_run is not None else '?'}")
    print(f"  Test Errors:         {num_test_err.text if num_test_err is not None else '?'}")
    print("=" * 60)

    for fail in root.findall(".//met:componentFailures", ns):
        fname = fail.find("met:fullName", ns)
        prob = fail.find("met:problem", ns)
        print(f"\n  COMPONENT FAILURE: {fname.text if fname is not None else '?'}")
        print(f"    {prob.text if prob is not None else '?'}")

    for fail in root.findall(".//met:runTestResult/met:failures", ns):
        name = fail.find("met:name", ns)
        method = fail.find("met:methodName", ns)
        msg = fail.find("met:message", ns)
        print(f"\n  TEST FAILURE: {name.text if name is not None else '?'}.{method.text if method is not None else '?'}")
        print(f"    {msg.text if msg is not None else '?'}")

    for succ in root.findall(".//met:runTestResult/met:successes", ns):
        name = succ.find("met:name", ns)
        method = succ.find("met:methodName", ns)
        print(f"  TEST PASS: {name.text if name is not None else '?'}.{method.text if method is not None else '?'}")

    if success is not None and success.text == "true":
        print("\nDeployment SUCCEEDED!")
        return True
    else:
        print("\nDeployment FAILED.")
        return False


# ── Custom Label for API Key ───────────────────────────────────
CUSTOM_LABEL_PATH = "labels/CustomLabels.labels"
CUSTOM_LABEL_XML = """<?xml version="1.0" encoding="UTF-8"?>
<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">
    <labels>
        <fullName>LegacySign_API_Key</fullName>
        <language>en_US</language>
        <protected>true</protected>
        <shortDescription>Legacy Sign API Key</shortDescription>
        <value>PLACEHOLDER</value>
    </labels>
</CustomLabels>
"""


# ── package.xml ─────────────────────────────────────────────────
PACKAGE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>LegacySignCallout</members>
        <members>LegacySignCallback</members>
        <members>LegacySignTest</members>
        <name>ApexClass</name>
    </types>
    <types>
        <members>LegacySignTrigger</members>
        <name>ApexTrigger</name>
    </types>
    <types>
        <members>LegacySign_API_Key</members>
        <name>CustomLabel</name>
    </types>
    <types>
        <members>LegacySign_Webhook</members>
        <name>RemoteSiteSetting</name>
    </types>
    <version>59.0</version>
</Package>
"""


# ── Remote Site Setting ────────────────────────────────────────
REMOTE_SITE_PATH = "remoteSiteSettings/LegacySign_Webhook.remoteSite"
REMOTE_SITE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<RemoteSiteSetting xmlns="http://soap.sforce.com/2006/04/metadata">
    <disableProtocolSecurity>false</disableProtocolSecurity>
    <isActive>true</isActive>
    <url>https://tlh-legacy-sign.pages.dev</url>
    <description>Legacy Sign webhook endpoint for e-signature callouts</description>
</RemoteSiteSetting>
"""


# ── Main ────────────────────────────────────────────────────────
if __name__ == "__main__":
    target = "SANDBOX" if "--sandbox" in sys.argv else "PRODUCTION"
    print(f"Legacy Sign SF Integration — Deploying to {target}")
    print("-" * 50)

    sf = connect()
    zip_buf = build_zip()
    deploy_id = deploy(sf, zip_buf)
    root, ns = poll_status(sf, deploy_id)
    ok = print_results(root, ns)
    sys.exit(0 if ok else 1)
