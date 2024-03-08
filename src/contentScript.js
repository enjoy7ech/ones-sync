"use strict";

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

// Log `title` of current active web page
// const pageTitle = document.head.getElementsByTagName("title")[0].innerHTML;
// console.log(
//   `Page title is: '${pageTitle}' - evaluated by Chrome extension's 'contentScript.js' file`
// );

// Communicate with background file by sending a message
// chrome.runtime.sendMessage(
//   {
//     type: "GREETINGS",
//     payload: {
//       message: "Hello, my name is Con. I am from ContentScript.",
//     },
//   },
//   (response) => {
//     console.log(response.message);
//   }
// );

// Listen for message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAddManHours = async () => {
    if (request.type === "ADD_MAN_HOURS") {
      try {
        const res = {
          success: [],
          fail: [],
        };
        const list = JSON.parse(request.payload);
        const valid = list.filter((o) => o.task);
        console.log(`====will fetch====`, valid);
        if (valid.length === 0) {
          return res;
        }
        const meRes = await fetch("/project/api/project/users/me");
        const me = await meRes.json();
        console.log("get user info:", me);
        if (!me.uuid) {
          return { fail: valid.map((o) => o.task) };
        }

        for (let o of valid) {
          try {
            const resp = await fetch(
              "/project/api/project/team/EfNEn1EW/items/graphql?t=AddManhour",
              {
                method: "post",
                body: JSON.stringify({
                  query:
                    "\n    mutation AddManhour {\n      addManhour (mode: $mode owner: $owner task: $task type: $type start_time: $start_time hours: $hours description: $description) {\n        key\n      }\n    }\n  ",
                  variables: {
                    mode: "simple",
                    owner: me.uuid,
                    task: o.task,
                    type: "recorded",
                    start_time: o.time,
                    hours: o.hours,
                    description: o.description,
                  },
                }),
              }
            );
            const respRes = await resp.json();
            if (resp.ok) {
              res.success.push({ task: o.task });
            } else {
              res.fail.push({ task: o.task, reason: respRes?.reason });
            }
          } catch (error) {
            res.fail.push({ task: o.task, reason: error.message });
          }
        }

        return res;
      } catch (error) {
        console.error(`ADD_MAN_HOURS失败:`, error);
        return { error };
      }
    }
  };

  if (request.type === "COUNT") {
    console.log(`Current count is ${request.payload.count}`);
  }

  handleAddManHours().then((res) => sendResponse(res));

  // Send an empty response
  // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
  return true;
});
