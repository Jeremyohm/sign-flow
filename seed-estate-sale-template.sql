-- Estate Sale Agreement Template — TLES SD
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- This creates the template for the TLES Estate Sale Agreement (SD county, 6-page PDF)

INSERT INTO public.templates (user_id, name, description, pages, signer_roles, fields, usage_count)
SELECT
  id,
  'TLES Estate Sale Agreement - SD',
  'Standard 6-page TLES estate sale agreement for San Diego county. 9 client initials (pp 1-3), TLES + Client signatures (p 6), client info fields.',
  6,
  '["TLES Representative", "Client"]'::jsonb,
  '[
    {"type":"initials","page":0,"x":460,"y":255,"w":80,"h":30,"signer":1},

    {"type":"initials","page":1,"x":126,"y":95,"w":80,"h":30,"signer":1},
    {"type":"initials","page":1,"x":114,"y":467,"w":80,"h":30,"signer":1},
    {"type":"initials","page":1,"x":243,"y":537,"w":80,"h":30,"signer":1},
    {"type":"initials","page":1,"x":449,"y":661,"w":80,"h":30,"signer":1},

    {"type":"initials","page":2,"x":235,"y":217,"w":80,"h":30,"signer":1},
    {"type":"initials","page":2,"x":48,"y":444,"w":80,"h":30,"signer":1},
    {"type":"initials","page":2,"x":132,"y":596,"w":80,"h":30,"signer":1},
    {"type":"initials","page":2,"x":233,"y":706,"w":80,"h":30,"signer":1},

    {"type":"signature","page":5,"x":145,"y":148,"w":300,"h":40,"signer":0},
    {"type":"date",     "page":5,"x":480,"y":152,"w":92,"h":30, "signer":0},
    {"type":"text",     "page":5,"x":160,"y":178,"w":400,"h":28,"signer":0},

    {"type":"signature","page":5,"x":150,"y":300,"w":295,"h":40,"signer":1},
    {"type":"date",     "page":5,"x":480,"y":304,"w":92,"h":30, "signer":1},
    {"type":"text",     "page":5,"x":120,"y":330,"w":445,"h":28,"signer":1},
    {"type":"text",     "page":5,"x":105,"y":357,"w":460,"h":28,"signer":1},
    {"type":"text",     "page":5,"x":80, "y":385,"w":230,"h":28,"signer":1},
    {"type":"text",     "page":5,"x":370,"y":385,"w":80, "h":28,"signer":1},
    {"type":"text",     "page":5,"x":485,"y":385,"w":85, "h":28,"signer":1},
    {"type":"text",     "page":5,"x":95, "y":412,"w":170,"h":28,"signer":1},
    {"type":"text",     "page":5,"x":310,"y":412,"w":255,"h":28,"signer":1},
    {"type":"text",     "page":5,"x":205,"y":440,"w":360,"h":28,"signer":1},
    {"type":"text",     "page":5,"x":155,"y":467,"w":410,"h":28,"signer":1},
    {"type":"text",     "page":5,"x":80, "y":495,"w":230,"h":28,"signer":1},
    {"type":"text",     "page":5,"x":370,"y":495,"w":85, "h":28,"signer":1},
    {"type":"text",     "page":5,"x":485,"y":495,"w":85, "h":28,"signer":1}
  ]'::jsonb,
  0
FROM auth.users
ORDER BY created_at ASC
LIMIT 1;
