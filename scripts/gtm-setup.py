"""Configure GTM container GTM-55H9SNZB with GA4 tags, triggers, and variables for eydn."""

import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"D:\projects\workspace\local\google-service-account.json"

from google.oauth2 import service_account
from googleapiclient.discovery import build
import time

SCOPES = ["https://www.googleapis.com/auth/tagmanager.edit.containers"]
credentials = service_account.Credentials.from_service_account_file(
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"], scopes=SCOPES
)
service = build("tagmanager", "v2", credentials=credentials)

ACCOUNT = "6345823758"
CONTAINER = "247177996"
WORKSPACE = "4"
PARENT = f"accounts/{ACCOUNT}/containers/{CONTAINER}/workspaces/{WORKSPACE}"

GA4_MEASUREMENT_ID = "G-75QMVEE2WY"

# ─── Variables ───────────────────────────────────────────────────────────────

DLV_VARS = [
    "value", "currency", "guest_count", "vendor_category", "guide_name",
    "rsvp_count", "entity_type", "export_format", "tier", "section_name",
]

print("Creating variables...")

# GA4 Measurement ID constant
service.accounts().containers().workspaces().variables().create(
    parent=PARENT,
    body={
        "name": "GA4 Measurement ID",
        "type": "c",
        "parameter": [{"type": "TEMPLATE", "key": "value", "value": GA4_MEASUREMENT_ID}],
    },
).execute()
print(f"  Created: GA4 Measurement ID = {GA4_MEASUREMENT_ID}")

# DataLayer variables
for var_name in DLV_VARS:
    service.accounts().containers().workspaces().variables().create(
        parent=PARENT,
        body={
            "name": f"DLV - {var_name}",
            "type": "v",
            "parameter": [
                {"type": "INTEGER", "key": "dataLayerVersion", "value": "2"},
                {"type": "TEMPLATE", "key": "name", "value": var_name},
            ],
        },
    ).execute()
    print(f"  Created: DLV - {var_name}")

# ─── Triggers ────────────────────────────────────────────────────────────────

EVENTS = [
    "sign_up", "onboarding_complete", "trial_start", "purchase",
    "chat_message", "guest_added", "guest_import", "vendor_added",
    "guide_complete", "vendor_brief_generated", "website_published",
    "rsvp_sent", "file_upload", "data_export", "task_created",
    "task_completed", "mood_board_add", "collaborator_invited",
    "vendor_placement", "section_view",
]

print("\nCreating triggers...")
trigger_ids = {}

for event_name in EVENTS:
    trigger = service.accounts().containers().workspaces().triggers().create(
        parent=PARENT,
        body={
            "name": f"CE - {event_name}",
            "type": "customEvent",
            "customEventFilter": [
                {
                    "type": "equals",
                    "parameter": [
                        {"type": "TEMPLATE", "key": "arg0", "value": "{{_event}}"},
                        {"type": "TEMPLATE", "key": "arg1", "value": event_name},
                    ],
                }
            ],
        },
    ).execute()
    trigger_ids[event_name] = trigger["triggerId"]
    print(f"  Created: CE - {event_name} (id={trigger['triggerId']})")

# ─── Tags ────────────────────────────────────────────────────────────────────

# Event parameter mappings
EVENT_PARAMS = {
    "purchase": [("value", "DLV - value"), ("currency", "DLV - currency")],
    "guest_import": [("guest_count", "DLV - guest_count")],
    "vendor_added": [("vendor_category", "DLV - vendor_category")],
    "guide_complete": [("guide_name", "DLV - guide_name")],
    "vendor_brief_generated": [("guide_name", "DLV - guide_name")],
    "rsvp_sent": [("rsvp_count", "DLV - rsvp_count")],
    "file_upload": [("entity_type", "DLV - entity_type")],
    "data_export": [("export_format", "DLV - export_format")],
    "vendor_placement": [("tier", "DLV - tier"), ("value", "DLV - value"), ("currency", "DLV - currency")],
    "section_view": [("section_name", "DLV - section_name")],
}

print("\nCreating GA4 config tag...")

# GA4 Config tag (fires on all pages)
service.accounts().containers().workspaces().tags().create(
    parent=PARENT,
    body={
        "name": "GA4 - Config",
        "type": "gaawc",
        "parameter": [
            {"type": "TEMPLATE", "key": "measurementId", "value": "{{GA4 Measurement ID}}"},
        ],
        "firingTriggerId": ["2147483647"],  # All Pages
        "tagFiringOption": "oncePerEvent",
    },
).execute()
print("  Created: GA4 - Config (All Pages)")

print("\nCreating GA4 event tags...")

for event_name in EVENTS:
    params = []
    if event_name in EVENT_PARAMS:
        param_list = []
        for param_name, var_ref in EVENT_PARAMS[event_name]:
            param_list.append({
                "type": "MAP",
                "map": [
                    {"type": "TEMPLATE", "key": "name", "value": param_name},
                    {"type": "TEMPLATE", "key": "value", "value": "{{" + var_ref + "}}"},
                ],
            })
        params.append({"type": "LIST", "key": "eventParameters", "list": param_list})

    tag_body = {
        "name": f"GA4 Event - {event_name}",
        "type": "gaawe",
        "parameter": [
            {"type": "TEMPLATE", "key": "measurementId", "value": "{{GA4 Measurement ID}}"},
            {"type": "TEMPLATE", "key": "eventName", "value": event_name},
        ] + params,
        "firingTriggerId": [trigger_ids[event_name]],
        "tagFiringOption": "oncePerEvent",
    }

    service.accounts().containers().workspaces().tags().create(
        parent=PARENT, body=tag_body
    ).execute()
    print(f"  Created: GA4 Event - {event_name}")

# ─── Publish ─────────────────────────────────────────────────────────────────

print("\nCreating version and publishing...")
version = service.accounts().containers().workspaces().create_version(
    path=PARENT,
    body={"name": "eydn analytics setup", "notes": "GA4 config + 20 event tags + triggers + variables"},
).execute()

version_id = version["containerVersion"]["containerVersionId"]
print(f"  Created version: {version_id}")

service.accounts().containers().versions().publish(
    path=f"accounts/{ACCOUNT}/containers/{CONTAINER}/versions/{version_id}"
).execute()
print(f"  Published version {version_id}")

print("\n✓ GTM container configured and published!")
print(f"  Container: GTM-55H9SNZB")
print(f"  GA4: {GA4_MEASUREMENT_ID}")
print(f"  Tags: 21 (1 config + 20 events)")
print(f"  Triggers: 20 custom events")
print(f"  Variables: 11 (1 constant + 10 dataLayer)")
