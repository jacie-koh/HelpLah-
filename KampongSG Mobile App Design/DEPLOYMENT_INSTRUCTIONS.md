# KampongSG Deployment Instructions

## ⚠️ IMPORTANT: Deploy Backend First

The backend server must be deployed to Supabase before the app can work.

## Step 1: Deploy Supabase Edge Function

### Option A: Deploy via Figma Make Settings
1. In Figma Make, go to **Settings** (gear icon in top right)
2. Find the **Supabase** section
3. Click **"Deploy Edge Function"** or **"Redeploy"** button
4. Wait for deployment to complete (you'll see a success message)

### Option B: Deploy via Supabase CLI (if available)
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref eryrjmodbspncqsnzrnn

# Deploy the function
supabase functions deploy make-server-fd25410b
```

## Step 2: Verify Deployment

After deploying, test if the backend is working:

```bash
curl https://eryrjmodbspncqsnzrnn.supabase.co/functions/v1/make-server-fd25410b/health
```

You should see:
```json
{"status":"ok"}
```

## Step 3: Create Demo Accounts

Once the backend is deployed:
1. Refresh the app
2. Click **"Create Demo Accounts"** on login screen
3. Wait for all 9 accounts to be created
4. Sign in with any demo email using password `demo123`

## Common Issues

### "Requested function was not found"
- **Problem**: Edge function not deployed
- **Solution**: Follow Step 1 to deploy the function

### "Invalid login credentials"
- **Problem**: Demo accounts not created yet
- **Solution**: Click "Create Demo Accounts" first, then sign in

### "Failed to create tasks" or other errors
- **Problem**: Backend function deployed but crashed
- **Solution**: Check Supabase function logs for errors

## Need Help?

The backend server code is in `/workspaces/default/code/supabase/functions/server/index.tsx`

If you're using Figma Make, the deployment should be handled through the Make settings interface. Look for the Supabase deployment button in the app settings.
