import requests
import os
import json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

# Configuration
CANVAS_TOKEN = os.getenv("CANVAS_TOKEN")
DISCORD_WEBHOOK = os.getenv("DUE_DATE_WEBHOOK")
COURSE_ID = "1496658"
CANVAS_DOMAIN = "webcourses.ucf.edu"
DUE_TIME = 72

# State file to remember sent alerts
script_dir = os.path.dirname(os.path.abspath(__file__))
state_file = os.path.join(script_dir, "sent_due_dates.json")

def load_sent_ids():
    if os.path.exists(state_file):
        with open(state_file, "r") as f:
            return json.load(f)
    return []

def save_sent_ids(sent_ids):
    with open(state_file, "w") as f:
        json.dump(sent_ids, f)

def poll_due_dates():
    if not CANVAS_TOKEN or not DISCORD_WEBHOOK:
        print("Missing environment variables.")
        return

    headers = {"Authorization": f"Bearer {CANVAS_TOKEN.strip()}"}
    # Bucket 'upcoming' gets assignments that haven't passed their due date
    url = f"https://{CANVAS_DOMAIN}/api/v1/courses/{COURSE_ID}/assignments?bucket=upcoming&order_by=due_at"
    
    response = requests.get(url, headers=headers)
    assignments = response.json()
    
    sent_ids = load_sent_ids()
    now = datetime.now(timezone.utc)
    warning_window = now + timedelta(hours=DUE_TIME) # 3-day warning

    new_alerts_sent = False

    for assignment in assignments:
        assign_id = str(assignment.get("id"))
        due_at_str = assignment.get("due_at")
        
        if not due_at_str or assign_id in sent_ids:
            continue

        # 2. Convert that UTC time to EST/EDT
        est_zone = ZoneInfo("America/New_York")
        due_date = datetime.strptime(due_at_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).astimezone(est_zone)

        # Only alert if it's within our 48-hour window
        if now < due_date <= warning_window:
            title = assignment.get("name")
            due_pretty = due_date.strftime("%A, %b %d at %I:%M %p UTC")
            link = assignment.get("html_url")

            payload = {
                "content": "@everyone **WATCH OUT LOSERS: UPCOMING DUE DATE DETECTED**",
                "embeds": [{
                    "title": title,
                    "description": f"This is due in less than 72 hours!\n**Due:** {due_pretty}",
                    "color": 15158332, # Reddish for urgency
                    "url": link
                }]
            }
            
            resp = requests.post(DISCORD_WEBHOOK, json=payload)
            if resp.status_code in [200, 204]:
                sent_ids.append(assign_id)
                new_alerts_sent = True
                print(f"Alerted for: {title}")

    if new_alerts_sent:
        save_sent_ids(sent_ids)
    else:
        print("No new upcoming due dates to alert.")

if __name__ == "__main__":
    poll_due_dates()