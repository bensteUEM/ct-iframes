# CT IFrames Extension

This extension provides additional iframes which can be used to embed churchtools information into restricted websites e.g. https://www.gemeindebaukasten.de/ used in ELKW.

## Usage ...
In order to use this extension without user login - (embed on public web pages)
1. Create a user "ct-iframes-tech-user" and set password to "<BASEURL>A1!" (replace with your own base URL inlcuding https:// and no / at end)
This user will automatically be created if login with this configuration is not possible. Password needs to be set manually!
2. Make sure "view", "view custom category" and "view custom data" permission are allowed for this user - NO Other rights should be available - not even show persons ...
3. Allow full access to the user who should be used to display the information - NOT the tech user
it might be better to use a dedicated user which only has access to the information required. 
4. Open the extension in ChuchTools Web View and "Share current user login"

WARNING - sharing the user token technically allows anybody with access to this token to make changes on behalf of this person.
Please be aware that this might compromise your security as the tech user setup is the same for all instances unless changed manually in the code.
It is strongly adivsed to use a seperate user with minimal permissions - USE WITH CAUTION !

### Re-Use of user credentials
This extension uses a saved login token.
After each execution a logout is performed because otherwise any user might be able to act on behalf of the user providing the token.

WARNING - if the execution of scripts is stopped before end of script users might still be logged in.

## Troubleshooting
Issues with login / permissions or similar are logged on JS Console - if anything does not work as expected try to use developer tools console to read these messages.

## Development and Deployment

make sure you have an .env file with VITE_BASE_URL and VITE_KEY

### Development Server

Start a development server with hot-reload:

```bash
npm run dev
```

> **Note:** For local development, make sure to configure CORS in your ChurchTools
> instance to allow requests from your local development server
> (typically `http://localhost:5173`).
> This can be done in the ChurchTools admin settings under:
> "System Settings" > "Integrations" > "API" > "Cross-Origin Resource Sharing"
>
> If login works in Chrome but not in Safari, the issue is usually that Safari has stricter cookie handling:
>
> - Safari blocks `Secure; SameSite=None` cookies on `http://localhost` (Chrome allows them in dev).
> - Safari also blocks cookies if the API is on another domain (third‑party cookies).
>
> **Fix:**
>
> 1. Use a Vite proxy so API calls go through your local server (`/api → https://xyz.church.tools`). This makes cookies look first‑party.
> 2. Run your dev server with **HTTPS**. You can generate a local trusted certificate with [mkcert](https://github.com/FiloSottile/mkcert).
>
> With proxy + HTTPS, Safari will accept and store cookies just like Chrome.

### Building for Production

To create a production build:

```bash
npm run build
```

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

### Deployment

To build and package your extension for deployment:

```bash
npm run deploy
```

This command will:

1. Build the project
2. Package it using the `scripts/package.js` script

You can find the package in the `releases` directory.

## API

Following endpoints are available. Permissions are possible per route. Types are documented in `ct-types.d.ts` (CustomModuleCreate, CustomModuleDataCategoryCreate, CustomModuleDataValueCreate)

GET `/custommodules` get all extensions  
GET `/custommodules/{extensionkey}` get an extensions by its key  
GET `/custommodules/{moduleId}` get an extension by its ID

GET `/custommodules/{moduleId}/customdatacategories`  
POST `/custommodules/{moduleId}/customdatacategories`  
PUT `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}`  
DELETE `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}`

GET `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues`  
POST `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues`  
PUT `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues/{valueId}`  
DELETE `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues/{valueId}`

## Support

For questions about the ChurchTools API, visit the [Forum](https://forum.church.tools).
