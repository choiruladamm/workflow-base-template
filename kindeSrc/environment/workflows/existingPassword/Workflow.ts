// import {
//   onExistingPasswordProvidedEvent,
//   WorkflowSettings,
//   WorkflowTrigger,
//   invalidateFormField,
//   secureFetch,
//   fetch,
//   getEnvironmentVariable,
//   createKindeAPI,
// } from "@kinde/infrastructure";

// export const workflowSettings: WorkflowSettings = {
//   id: "onExistingPasswordProvided",
//   trigger: WorkflowTrigger.ExistingPasswordProvided,
//   failurePolicy: { action: "stop" },
//   bindings: {
//     "kinde.widget": {},
//     "kinde.secureFetch": {},
//     "kinde.fetch": {},
//     "kinde.env": {},
//     url: {},
//   },
// };

// export default async function Workflow(event: onExistingPasswordProvidedEvent) {
//   const { providedEmail, password, hashedPassword, hasUserRecordInKinde } =
//     event.context.auth;

//   console.log(`[START] Processing login for: ${providedEmail}`);
//   console.log(`[AUTH] hasUserRecordInKinde: ${hasUserRecordInKinde}`);

//   if (hasUserRecordInKinde) {
//     console.log("[SKIP] User already exists in Kinde, skipping workflow");
//     return;
//   }

//   const API_BASE = getEnvironmentVariable("API_BASE_URL")?.value;
//   if (!API_BASE) {
//     console.error("[ERROR] API_BASE_URL environment variable not set");
//     throw Error("API_BASE_URL not set");
//   }
//   console.log(`[CONFIG] API_BASE_URL: ${API_BASE}`);

//   try {
//     console.log(`[REQUEST] POST ${API_BASE}/auth/authorize`);
//     const loginRes = await secureFetch(`${API_BASE}/auth/authorize`, {
//       method: "POST",
//       responseFormat: "json",
//       headers: { "content-type": "application/json" },
//       body: { account: providedEmail, password },
//     });
//     console.log(`[RESPONSE] /auth/authorize status: ${loginRes?.status || "no status"}`);

//     if (!loginRes?.data) {
//       console.warn("[FAIL] Login failed - invalid email or password");
//       invalidateFormField("p_password", "Email or password not found");
//       return;
//     }
//     console.log("[SUCCESS] Login success, token obtained");

//     console.log(`[REQUEST] GET ${API_BASE}/v3/user/me`);
//     const meRes = await secureFetch(`${API_BASE}/v3/user/me`, {
//       method: "GET",
//       responseFormat: "json",
//       headers: { Authorization: `Bearer ${loginRes.data}` },
//     });
//     console.log(`[RESPONSE] /v3/user/me status: ${meRes?.status || "no status"}`);

//     if (!meRes?.data?.success) {
//       console.warn("[FAIL] Failed to fetch user data after login");
//       invalidateFormField("p_password", "Failed to get user data");
//       return;
//     }

//     const userData = meRes.data.data;
//     const nameParts = (userData.fullName ?? "").split(" ");
//     console.log(`[USER] id: ${userData.id}, name: ${userData.fullName}, role: ${userData.role}`);

//     console.log("[KINDE] Initializing Management API...");
//     const kindeAPI = await createKindeAPI(event);

//     console.log("[KINDE] Creating user in Kinde...");
//     const { data: res } = await kindeAPI.post({
//       endpoint: "user",
//       params: JSON.stringify({
//         profile: {
//           given_name: nameParts[0] || userData.email,
//           family_name: nameParts.slice(1).join(" ") || "",
//         },
//         identities: [{
//           type: "email",
//           is_verified: true,
//           details: { email: providedEmail },
//         }],
//       }),
//     });
//     console.log(`[KINDE] User created with ID: ${res.id}`);

//     console.log("[KINDE] Setting password...");
//     const { data: pwdRes } = await kindeAPI.put({
//       endpoint: `users/${res.id}/password`,
//       params: {
//         hashed_password: hashedPassword,
//       },
//     });
//     console.log(`[KINDE] Password set: ${pwdRes?.message || "OK"}`);
//     console.log("[COMPLETE] Migration successful, login proceeds");

//   } catch (error) {
//     console.error("[FATAL] Workflow error:", error);
//     throw error;
//   }
// }


import {
  onExistingPasswordProvidedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  invalidateFormField,
  secureFetch,
  fetch,
  getEnvironmentVariable,
  createKindeAPI
} from "@kinde/infrastructure";

const API_BASE_URL = "https://api.testing.scafflinq.com";

// This workflow requires you to set up the Kinde management API
// You can do this by going to the Kinde dashboard.
//
// Create an M2M application with the following scopes enabled:
// * create:users
// * update:user_passwords
//
// In Settings -> Environment variables set up the following variables with the
// values from the M2M application you created above:
//
// * KINDE_WF_M2M_CLIENT_ID
// * KINDE_WF_M2M_CLIENT_SECRET - Ensure this is setup with sensitive flag
// enabled to prevent accidental sharing
//
// Add an environment variable with the key `CHECK_PASSWORD_API_URL`
// and the value of your URL for checking passwords.
//
// This workflow requires you to set up your encryption key for the workflow
// This enables `secureFetch` to encrypt the payload sent to your API

// The setting for this workflow
export const workflowSettings: WorkflowSettings = {
  id: "onExistingPasswordProvided",
  trigger: WorkflowTrigger.ExistingPasswordProvided,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.widget": {}, // Required for accessing the UI
    "kinde.secureFetch": {}, // Required for secure external API calls
    "kinde.env": {}, // required to access your environment variables
    "kinde.fetch": {}, // Required for management API calls
    url: {}, // required for url params
  },
};

// The workflow code to be executed when the event is triggered
export default async function Workflow(event: onExistingPasswordProvidedEvent) {
  const { hashedPassword, providedEmail, password, hasUserRecordInKinde } =
    event.context.auth;

  if (hasUserRecordInKinde) {
    console.log("User exists in Kinde, without password, so no need to check external system");    
  }
  
  // console.log("User does not exist in Kinde");
  try {
    // The URL of the API you want to send the payload to
    const BASE_URL = getEnvironmentVariable(
      "API_BASE_URL"
    )?.value;

    if (!BASE_URL) {
      throw Error("Endpoint not set");
    }

    // The payload you want to send
    const payload = {
      email: providedEmail,
      password: password,
    };


    console.log('entry triggered legacy login')
    const response = await fetch(BASE_URL + "/v3/auth/legacy-login", {
      method: "POST",
      responseFormat: "json",
      headers: {
        "content-type": "application/json",
      },
      body: payload,
    });

    console.log("done fetc")
    console.log(JSON.stringify(response))

    // console.log('response triggered legacy login', response)
      // console.log({response});
    // if (response.status === 200) {
    // }
    // console.log('response triggered legacy login')

    // if (!userData) {
    //   // If the email/password is not verified in the external system, you can invalidate the form field
    //   invalidateFormField("p_password", "Email or password not found");
    // } 

    // if (!response.ok) {
    //   // If the email/password is not verified in the external system, you can invalidate the form field
    //   invalidateFormField("p_password", "Email or password not found");
    // }
    // else {
    //   // Password is verified in the external system
    //   // You can create the user in Kinde and set the password
    //   const kindeAPI = await createKindeAPI(event);

    //   // Create the user in Kinde
    //   // You can use the userData from the external system to populate the Kinde user
    //   const { data: res } = await kindeAPI.post({
    //     endpoint: `user`,
    //     params: JSON.stringify({
    //       profile: {
    //         given_name: userData.given_name,
    //         family_name: userData.family_name,
    //       },
    //       identities: [
    //         {
    //           type: "email",
    //           // Mark email as verified since user authenticated via external system
    //           is_verified: true,
    //           details: {
    //             email: providedEmail,
    //           },
    //         },
    //       ],
    //     }),
    //   });

    //   const userId = res.id;

    //   // Set the password for the user in Kinde
    //   // You can use the hashed password provided by Kinde
    //   const { data: pwdRes } = await kindeAPI.put({
    //     endpoint: `users/${userId}/password`,
    //     params: {
    //       hashed_password: hashedPassword,
    //     },
    //   });
    //   console.log(pwdRes.message);
    // }
  } catch (error) {
    console.error("error", error);
  }
}