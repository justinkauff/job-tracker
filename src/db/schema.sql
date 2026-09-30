-- Applications: the job itself and where the application stands
CREATE TABLE IF NOT EXISTS applications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    company      TEXT NOT NULL,
    role         TEXT,
    status       TEXT NOT NULL DEFAULT 'wishlist'
                   CHECK (status IN ('wishlist', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
    date_applied TEXT
                   CHECK (date_applied GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    location     TEXT,
    url          TEXT,
    notes        TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contacts: the people involved with an application, and networking status
CREATE TABLE IF NOT EXISTS contacts (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id    INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    title             TEXT,
    email             TEXT,
    linkedin_url      TEXT,
    how_met           TEXT,
    outreach_status   TEXT NOT NULL DEFAULT 'not_contacted'
                        CHECK (outreach_status IN ('not_contacted', 'reached_out', 'responded', 'no_response')),
    referral_status   TEXT NOT NULL DEFAULT 'none'
                        CHECK (referral_status IN ('none', 'asked', 'referred', 'declined')),
    last_contacted_on TEXT
                        CHECK (last_contacted_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    notes             TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Foreign keys aren't indexed automatically; this makes "contacts for application X" fast
CREATE INDEX IF NOT EXISTS idx_contacts_application_id ON contacts(application_id);
