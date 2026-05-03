import json, requests, uuid, fitz  # fitz = PyMuPDF

SUPABASE_URL = 'https://cfoeshzynalhsfrvotmz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmb2VzaHp5bmFsaHNmcnZvdG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA1MTkyNSwiZXhwIjoyMDkyNjI3OTI1fQ.Kw18g9Ba-qdcjWsHMoWW4IIl8CvV-fxKcuFYwv5RrOo'

TEMPLATES_DIR = r'C:\Users\couge\True Legacy Homes Dropbox\True Legacy Team Folder\Accounting Tools\Main\AI\TLH AI\tlh-cornerstone\src\it\legacy-sign\templates'

template_id = str(uuid.uuid4())
print(f'Template ID: {template_id}')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

# Get existing user_id
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/templates?select=user_id&limit=1',
    headers={**headers, 'Prefer': 'return=representation'}
)
existing = r.json()
if existing:
    user_id = existing[0]['user_id']
    print(f'Using user_id: {user_id}')
else:
    r2 = requests.get(f'{SUPABASE_URL}/auth/v1/admin/users', headers=headers)
    users = r2.json().get('users', [])
    user_id = users[0]['id'] if users else None
    print(f'From auth: {user_id}')

# === STEP 1: Render PDFs to PNGs ===
pdfs = [
    TEMPLATES_DIR + '/New_Vendor_Packet_Main.pdf',
    TEMPLATES_DIR + '/New_Vendor_Packet_W9_and_Payout_Schedule.pdf',
]

page_images = []
page_num = 0
DPI = 150
for pdf_path in pdfs:
    doc = fitz.open(pdf_path)
    print(f'Rendering {pdf_path} ({doc.page_count} pages)')
    for i in range(doc.page_count):
        page = doc[i]
        mat = fitz.Matrix(DPI / 72, DPI / 72)
        pix = page.get_pixmap(matrix=mat)
        png_data = pix.tobytes('png')

        storage_path = f'templates/{template_id}/page_{page_num}.png'
        upload_url = f'{SUPABASE_URL}/storage/v1/object/pdfs/{storage_path}'
        r = requests.post(upload_url, data=png_data, headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'image/png',
        })
        if r.status_code in (200, 201):
            public_url = f'{SUPABASE_URL}/storage/v1/object/public/pdfs/{storage_path}'
            page_images.append(public_url)
            print(f'  Page {page_num}: uploaded')
        else:
            print(f'  Page {page_num}: FAILED ({r.status_code}) {r.text[:200]}')
        page_num += 1
    doc.close()

total_pages = page_num
print(f'Total pages: {total_pages}')
print(f'Page images: {len(page_images)}')

# === STEP 2: Define fields ===
# Signer roles: 0=TLH PM, 1=Vendor
signer_roles = ['TLH Project Manager', 'Vendor']

fields = [
    # === PAGE 0: Vendor Registration Form ===
    # Vendor fills in their info
    {'type': 'text', 'page': 0, 'x': 200, 'y': 120, 'w': 320, 'h': 16, 'signer_index': 1, 'label': 'Business Name'},
    {'type': 'text', 'page': 0, 'x': 200, 'y': 143, 'w': 320, 'h': 16, 'signer_index': 1, 'label': 'First Name'},
    {'type': 'text', 'page': 0, 'x': 200, 'y': 166, 'w': 320, 'h': 16, 'signer_index': 1, 'label': 'Last Name'},
    {'type': 'text', 'page': 0, 'x': 200, 'y': 189, 'w': 320, 'h': 16, 'signer_index': 1, 'label': 'Cell Phone'},
    {'type': 'text', 'page': 0, 'x': 200, 'y': 212, 'w': 320, 'h': 16, 'signer_index': 1, 'label': 'Email'},

    # PM fills in payment method and internal fields
    {'type': 'text', 'page': 0, 'x': 72, 'y': 530, 'w': 440, 'h': 16, 'signer_index': 0, 'label': 'Mailing Address (if check)'},
    {'type': 'text', 'page': 0, 'x': 200, 'y': 680, 'w': 280, 'h': 16, 'signer_index': 0, 'label': 'Vendor Owner'},
    {'type': 'text', 'page': 0, 'x': 200, 'y': 705, 'w': 280, 'h': 16, 'signer_index': 0, 'label': 'Location'},
    {'type': 'initials', 'page': 0, 'x': 270, 'y': 730, 'w': 60, 'h': 16, 'signer_index': 0, 'label': 'PM Initials'},

    # === PAGE 2: RAMP Registration (page index 2) ===
    {'type': 'initials', 'page': 2, 'x': 460, 'y': 735, 'w': 60, 'h': 16, 'signer_index': 1, 'label': 'Vendor Initial RAMP Reg'},

    # === PAGE 3: Ramp Rules - Sending Invoices ===
    {'type': 'initials', 'page': 3, 'x': 460, 'y': 735, 'w': 60, 'h': 16, 'signer_index': 1, 'label': 'Vendor Initial Invoices'},

    # === PAGE 4: Receiving Payments ===
    {'type': 'initials', 'page': 4, 'x': 460, 'y': 545, 'w': 60, 'h': 16, 'signer_index': 1, 'label': 'Vendor Initial Payments'},

    # === PAGE 5: Pay Cycle Calendar ===
    {'type': 'initials', 'page': 5, 'x': 460, 'y': 735, 'w': 60, 'h': 16, 'signer_index': 1, 'label': 'Vendor Initial Pay Cycle'},

    # === PAGE 8: W-9 Form ===
    # Vendor fills W-9
    {'type': 'text', 'page': 8, 'x': 72, 'y': 75, 'w': 380, 'h': 16, 'signer_index': 1, 'label': 'W9 Name'},
    {'type': 'text', 'page': 8, 'x': 72, 'y': 105, 'w': 380, 'h': 16, 'signer_index': 1, 'label': 'W9 Business Name'},
    {'type': 'text', 'page': 8, 'x': 72, 'y': 230, 'w': 380, 'h': 16, 'signer_index': 1, 'label': 'W9 Address'},
    {'type': 'text', 'page': 8, 'x': 72, 'y': 258, 'w': 380, 'h': 16, 'signer_index': 1, 'label': 'W9 City State Zip'},
    {'type': 'text', 'page': 8, 'x': 410, 'y': 310, 'w': 130, 'h': 30, 'signer_index': 1, 'label': 'W9 SSN or EIN'},
    {'type': 'signature', 'page': 8, 'x': 72, 'y': 480, 'w': 280, 'h': 35, 'signer_index': 1, 'label': 'W9 Signature'},
    {'type': 'date', 'page': 8, 'x': 400, 'y': 480, 'w': 130, 'h': 20, 'signer_index': 1, 'label': 'W9 Date'},
]

# === STEP 3: Create template ===
template_data = {
    'id': template_id,
    'user_id': user_id,
    'name': 'New Vendor Packet',
    'description': 'TLH new vendor registration package. Vendor info form, RAMP payment registration, invoice guidelines, W-9 tax form. Requires TLH PM and Vendor signatures.',
    'pages': total_pages,
    'signer_roles': signer_roles,
    'fields': fields,
    'page_images': page_images,
}

r = requests.post(
    f'{SUPABASE_URL}/rest/v1/templates',
    json=template_data,
    headers={**headers, 'Prefer': 'return=representation'}
)
print(f'Status: {r.status_code}')
if r.status_code in (200, 201):
    result = r.json()
    tid = result[0]['id'] if isinstance(result, list) else result.get('id')
    tname = result[0]['name'] if isinstance(result, list) else result.get('name')
    print(f'Template created: {tid}')
    print(f'Name: {tname}')

    # Save template data for reference
    with open(TEMPLATES_DIR + '/_nvp_template_data.json', 'w') as f:
        json.dump({'template_id': template_id, 'page_images': page_images, 'pages': total_pages}, f)
    print('Saved _nvp_template_data.json')
else:
    print(r.text[:500])
