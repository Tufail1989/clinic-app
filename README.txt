CLINIC AI — clinic SaaS console (v1.4)
Dashboard, AI receptionist, appointments, patients, billing, analytics, settings.

WHAT IS IN HERE
  index.html                  the whole app
  functions/api/chat.js       AI endpoint for CLOUDFLARE PAGES  (/api/chat)
  netlify/functions/chat.js   AI endpoint for NETLIFY           (/.netlify/functions/chat)
  manifest.webmanifest, sw.js, icon.svg      installable phone app + offline
  _headers                    microphone permission on Cloudflare
  netlify.toml                microphone permission + function settings on Netlify

The page finds whichever endpoint exists, so the SAME folder works on both hosts.

------------------------------------------------------------------
OPTION A — CLOUDFLARE PAGES  (recommended: unlimited bandwidth,
100,000 function calls/day, 500 builds/month on the free plan)

 1. Sign up at  dash.cloudflare.com  (free).
 2. Left menu: Compute (Workers & Pages)  >  Create  >  Pages  >
    "Upload assets"  (this is the drag-and-drop option, no GitHub needed).
 3. Name the project, e.g. aiclinicbooking. Drag the WHOLE FOLDER in. Deploy.
 4. Add your key:  project  >  Settings  >  Variables and secrets  >  Add
        Type:  Secret
        Name:  ANTHROPIC_API_KEY
        Value: sk-ant-...
    Optional:  MODEL = claude-haiku-4-5      ACCESS_CODE = anything you like
 5. Deployments  >  ...  >  Retry deployment   (variables only apply to a new build)
 6. Open  https://YOUR-PROJECT.pages.dev/api/chat   -> should show  "ai":true
 7. Open the site. Under the chat it should say "Live AI on your site".

 Updating later: Pages > your project > Create new deployment > drag the folder again.

------------------------------------------------------------------
OPTION B — NETLIFY  (free plan = 300 credits/month; each deploy costs
15 credits, so about 20 deploys a month, then the site pauses)

 1. app.netlify.com/drop  >  drag the WHOLE FOLDER.
 2. Site configuration > Environment variables > ANTHROPIC_API_KEY = sk-ant-...
 3. Deploys > Trigger deploy > Deploy site.
 4. Check  /.netlify/functions/chat   -> should show  "ai":true

 Tip: deploy to Netlify only when you have real changes; test locally first.

------------------------------------------------------------------
PHONE APP
  iPhone/Safari:  open the link > Share > Add to Home Screen.
  Android/Chrome: menu > Add to home screen (or the green Install app button).
  After deploying an update: close the app fully, reopen, and check the version
  number in the sidebar and in Clinic setup.

COSTS
  Hosting: free on both.
  AI: about $0.02-0.04 per patient conversation on claude-haiku-4-5.
  Set a monthly spend limit in console.anthropic.com.
