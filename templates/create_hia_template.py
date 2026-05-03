import json, requests

SUPABASE_URL = 'https://cfoeshzynalhsfrvotmz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmb2VzaHp5bmFsaHNmcnZvdG16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA1MTkyNSwiZXhwIjoyMDkyNjI3OTI1fQ.Kw18g9Ba-qdcjWsHMoWW4IIl8CvV-fxKcuFYwv5RrOo'

TEMPLATES_DIR = r'C:\Users\couge\True Legacy Homes Dropbox\True Legacy Team Folder\Accounting Tools\Main\AI\TLH AI\tlh-cornerstone\src\it\legacy-sign\templates'
with open(TEMPLATES_DIR + '/_template_data.json') as f:
    td = json.load(f)

template_id = td['template_id']
page_images = td['page_images']

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

# Get existing user_id from templates table
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

# Signer roles: 0=TLH PM, 1=TLH Director, 2=Contractor
signer_roles = ['TLH Project Manager', 'TLH Director of Construction', 'Contractor']

fields = [
    # === PAGE 0: Header fill-ins + initials ===
    {'type': 'text', 'page': 0, 'x': 390, 'y': 117, 'w': 140, 'h': 16, 'signer_index': 0, 'label': 'Effective Date'},
    {'type': 'text', 'page': 0, 'x': 72, 'y': 135, 'w': 300, 'h': 16, 'signer_index': 2, 'label': 'Contractor Name'},
    {'type': 'text', 'page': 0, 'x': 290, 'y': 165, 'w': 240, 'h': 16, 'signer_index': 0, 'label': 'Property Address'},
    {'type': 'initials', 'page': 0, 'x': 72, 'y': 460, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 1.1'},
    {'type': 'initials', 'page': 0, 'x': 72, 'y': 595, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 1.2'},

    # === PAGE 3: Compensation ===
    {'type': 'text', 'page': 3, 'x': 310, 'y': 528, 'w': 130, 'h': 16, 'signer_index': 0, 'label': 'Compensation Amount'},
    {'type': 'initials', 'page': 3, 'x': 72, 'y': 545, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 2.1'},
    {'type': 'text', 'page': 3, 'x': 380, 'y': 575, 'w': 130, 'h': 16, 'signer_index': 0, 'label': 'Rough Bonus Amount'},
    {'type': 'initials', 'page': 3, 'x': 72, 'y': 610, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 2.2'},

    # === PAGE 4: More bonuses + schedule ===
    {'type': 'text', 'page': 4, 'x': 380, 'y': 72, 'w': 130, 'h': 16, 'signer_index': 0, 'label': 'Final Bonus Amount'},
    {'type': 'initials', 'page': 4, 'x': 72, 'y': 100, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 2.3'},
    {'type': 'text', 'page': 4, 'x': 460, 'y': 145, 'w': 60, 'h': 16, 'signer_index': 0, 'label': 'Early Bonus Per Day'},
    {'type': 'initials', 'page': 4, 'x': 72, 'y': 175, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 2.4'},
    {'type': 'initials', 'page': 4, 'x': 72, 'y': 320, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 3.2'},
    {'type': 'initials', 'page': 4, 'x': 72, 'y': 440, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 3.4'},
    {'type': 'text', 'page': 4, 'x': 310, 'y': 550, 'w': 110, 'h': 16, 'signer_index': 0, 'label': 'Start Date'},
    {'type': 'text', 'page': 4, 'x': 310, 'y': 568, 'w': 110, 'h': 16, 'signer_index': 0, 'label': 'Completion Date'},

    # === PAGE 5: Schedule continued ===
    {'type': 'initials', 'page': 5, 'x': 72, 'y': 118, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 4.1.1'},
    {'type': 'initials', 'page': 5, 'x': 72, 'y': 180, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 4.2'},
    {'type': 'text', 'page': 5, 'x': 350, 'y': 200, 'w': 110, 'h': 16, 'signer_index': 0, 'label': 'Rough Completion Date'},
    {'type': 'initials', 'page': 5, 'x': 72, 'y': 365, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 4.4.1'},
    {'type': 'initials', 'page': 5, 'x': 72, 'y': 570, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 4.6'},

    # === PAGE 6: Quality ===
    {'type': 'initials', 'page': 6, 'x': 72, 'y': 72, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 4.6 cont'},
    {'type': 'initials', 'page': 6, 'x': 72, 'y': 250, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 5.1.1'},
    {'type': 'initials', 'page': 6, 'x': 72, 'y': 345, 'w': 60, 'h': 16, 'signer_index': 2, 'label': 'Initial 5.2'},

    # === PAGE 10: SIGNATURE PAGE ===
    # TLH Project Manager
    {'type': 'signature', 'page': 10, 'x': 72, 'y': 230, 'w': 280, 'h': 40, 'signer_index': 0, 'label': 'TLH PM Signature'},
    {'type': 'date', 'page': 10, 'x': 400, 'y': 230, 'w': 130, 'h': 20, 'signer_index': 0, 'label': 'TLH PM Date'},
    {'type': 'text', 'page': 10, 'x': 72, 'y': 275, 'w': 280, 'h': 20, 'signer_index': 0, 'label': 'TLH PM Print Name'},

    # TLH Director of Construction
    {'type': 'signature', 'page': 10, 'x': 72, 'y': 330, 'w': 280, 'h': 40, 'signer_index': 1, 'label': 'Director Signature'},
    {'type': 'date', 'page': 10, 'x': 400, 'y': 330, 'w': 130, 'h': 20, 'signer_index': 1, 'label': 'Director Date'},
    {'type': 'text', 'page': 10, 'x': 72, 'y': 375, 'w': 280, 'h': 20, 'signer_index': 1, 'label': 'Director Print Name'},

    # Contractor
    {'type': 'signature', 'page': 10, 'x': 72, 'y': 470, 'w': 280, 'h': 40, 'signer_index': 2, 'label': 'Contractor Signature'},
    {'type': 'date', 'page': 10, 'x': 400, 'y': 470, 'w': 130, 'h': 20, 'signer_index': 2, 'label': 'Contractor Date'},
    {'type': 'text', 'page': 10, 'x': 72, 'y': 515, 'w': 400, 'h': 20, 'signer_index': 2, 'label': 'Contractor Full Name'},
    {'type': 'text', 'page': 10, 'x': 72, 'y': 540, 'w': 220, 'h': 20, 'signer_index': 2, 'label': 'License Number'},
    {'type': 'text', 'page': 10, 'x': 380, 'y': 540, 'w': 150, 'h': 20, 'signer_index': 2, 'label': 'License Expiration'},
    {'type': 'text', 'page': 10, 'x': 72, 'y': 565, 'w': 400, 'h': 20, 'signer_index': 2, 'label': 'Contractor Address'},
    {'type': 'text', 'page': 10, 'x': 72, 'y': 590, 'w': 200, 'h': 20, 'signer_index': 2, 'label': 'City'},
    {'type': 'text', 'page': 10, 'x': 300, 'y': 590, 'w': 60, 'h': 20, 'signer_index': 2, 'label': 'State'},
    {'type': 'text', 'page': 10, 'x': 380, 'y': 590, 'w': 100, 'h': 20, 'signer_index': 2, 'label': 'Zip'},
    {'type': 'text', 'page': 10, 'x': 72, 'y': 615, 'w': 150, 'h': 20, 'signer_index': 2, 'label': 'Phone'},
    {'type': 'text', 'page': 10, 'x': 250, 'y': 615, 'w': 230, 'h': 20, 'signer_index': 2, 'label': 'Email'},

    # === PAGE 11: PAY CYCLE ===
    {'type': 'text', 'page': 11, 'x': 290, 'y': 640, 'w': 220, 'h': 20, 'signer_index': 2, 'label': 'Contractor Name (Pay Cycle)'},
    {'type': 'signature', 'page': 11, 'x': 290, 'y': 665, 'w': 220, 'h': 35, 'signer_index': 2, 'label': 'Contractor Signature (Pay Cycle)'},
    {'type': 'date', 'page': 11, 'x': 290, 'y': 705, 'w': 140, 'h': 20, 'signer_index': 2, 'label': 'Date (Pay Cycle)'},
]

template_data = {
    'id': template_id,
    'user_id': user_id,
    'name': 'Home Improvement Agreement',
    'description': 'TLH contractor agreement for flips and renovations. Main agreement (11 pages) + contractor pay cycle (1 page). Requires TLH PM, Director of Construction, and Contractor signatures.',
    'pages': 12,
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
else:
    print(r.text[:500])
