"use strict";

import "./popup.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle";
import moment from "moment";

function notify(title) {
  if (Notification.permission === "granted") {
    // Check whether notification permissions have already been granted;
    // if so, create a notification
    const notification = new Notification(title);
    // …
  } else if (Notification.permission !== "denied") {
    // We need to ask the user for permission
    Notification.requestPermission().then((permission) => {
      // If the user accepts, let's create a notification
      if (permission === "granted") {
        const notification = new Notification(title);
        // …
      }
    });
  }
}

function parseTime(str) {
  const t = /（(.+)-.+）/.exec(str)?.[1];
  return moment(`2024-${t} 08:00:00`);
}

(function () {
  // We will make use of Storage API to get and store `count` value
  // More information on Storage API can we found at
  // https://developer.chrome.com/extensions/storage

  // To get storage access, we have to mention it in `permissions` property of manifest.json file
  // More information on Permissions can we found at
  // https://developer.chrome.com/extensions/declare_permissions
  let data = [];

  function renderTable() {
    const renderStatus = (s, i, reason) => {
      if (s === 0) {
        return `<th scope="row">${i + 1}</th>`;
      }
      if (s === 1) {
        return `<th scope="row" class="text-primary"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check2-circle" viewBox="0 0 16 16">
        <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0"/>
        <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0z"/>
      </svg></th>`;
      }
      if (s === -1) {
        return `<th scope="row" class="text-danger" style="max-width:150px"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle" viewBox="0 0 16 16">
        <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
        <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
      </svg><em style="font-size:10px">${reason}</em>
      </th>`;
      }
      if (s === 69) {
        return `<th scope="row">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </th>`;
      }
      return `<th scope="row">${i + 1}</th>`;
    };
    const t = document.querySelector("#data");

    t.innerHTML = `<thead>
  <tr>
    <th scope="col">#</th>
    <th scope="col">taskId</th>
    <th scope="col" width="120">时间点</th>
    <th scope="col">时长</th>
    <th scope="col">描述</th>
  </tr>
</thead>
<tbody>
${data
  .map((d, i) => {
    return `<tr>
${renderStatus(d.status, i, d.reason)}
<td><a href="https://ones.cn/project/#/team/EfNEn1EW/task/${
      d.task
    }" target="_blank">${d.task}</a></td>
<td>${moment(d.time).format("YY-MM-DD HH:mm")}</td>
<td>${d.hours / 100000}</td>
<td>${d.description}</td>
</tr>`;
  })
  .join("")}
</tbody>`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const store = await chrome.storage.sync.get("data");
    data = store?.data ?? [];
    console.log("sync data:", data);

    renderTable();
    document.querySelector("#xls").addEventListener("click", async () => {
      data = [];
      var inp = document.createElement("textarea");
      document.body.appendChild(inp);
      inp.focus();
      document.execCommand("paste");
      const text = inp.value; //this is your clipboard data
      document.body.removeChild(inp);
      console.log("!text", text);
      const f1 = text.split("\n").map((d) => d.split("\t"));
      if (!f1?.[0]?.[0]) {
        return notify("时间读取失败，确认第一行有时间");
      }
      let preT;
      const tRemain = {};
      const reqT = (t, hours, tList = []) => {
        if (tRemain[t.format("MM-DD")] === undefined) {
          tRemain[t.format("MM-DD")] = 8 * 100000;
          return reqT(t, hours, tList);
        } else {
          if (tRemain[t.format("MM-DD")] < hours) {
            if (tRemain[t.format("MM-DD")] === 0) {
              return reqT(moment(t).add(1, "day"), hours, [...tList]);
            } else {
              const res = reqT(
                moment(t).add(1, "day"),
                hours - tRemain[t.format("MM-DD")],
                [...tList, { time: t, hours: tRemain[t.format("MM-DD")] }]
              );
              tRemain[t.format("MM-DD")] = 0;
              return res;
            }
          } else {
            // 当天够分
            const c = [
              ...tList,
              {
                time: moment(t).add(
                  8 - tRemain[t.format("MM-DD")] / 100000,
                  "hours"
                ),
                hours,
              },
            ];
            tRemain[t.format("MM-DD")] -= hours;
            return c;
          }
        }
      };
      f1.forEach((d) => {
        if (d[0]) {
          preT = d[0];
        }
        const hours = (d[4] * 100000) / d[1].split(",").length;
        d[1].split(",").forEach((t) => {
          data.push(
            ...reqT(parseTime(preT), hours).map((o) => {
              return {
                /**
                 * status
                 * 69: 提交中
                 * 0：未提交
                 * -1：提交失败
                 * 1：提交成功
                 */
                status: 0,
                time: o.time.format("YYYY-MM-DD HH:mm:ss"),
                task: t,
                description: d[2],
                hours: o.hours,
              };
            })
          );
        });
      });
      console.log("!data", data);
      renderTable();

      chrome.storage.sync.set({ data });
    });

    document.querySelector("#submit").addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: "ADD_MAN_HOURS",
            payload: JSON.stringify(
              data
                .filter((o) => o.task && o.status !== 1)
                .map((o) => {
                  o.status = 69;
                  return {
                    ...o,
                    time: moment(o.time).unix(),
                  };
                })
            ),
          },
          (response) => {
            if (response == undefined) {
              alert("提交失败");
              return;
            }
            console.log("ADD_MAN_HOURS: Res", response);
            if (response.error) {
              document.querySelector(
                "#notes"
              ).innerHTML = `<div class="alert alert-danger" role="alert">${response.error.message}</div>`;
            } else {
              response.success.forEach((o) => {
                const tar = data.find(
                  (x) => x.task === o.task && x.status === 69
                );
                if (tar) tar.status = 1;
              });
              response.fail.forEach((o) => {
                const tar = data.find(
                  (x) => x.task === o.task && x.status === 69
                );
                if (tar) {
                  tar.status = -1;
                  tar.reason = o.reason;
                }
              });
              console.log("Sync Response Status", data);
              chrome.storage.sync.set({ data });
              renderTable();
            }
          }
        );

        chrome.storage.sync.set({ data });
        renderTable();
      });
    });
  });

  // Communicate with background file by sending a message
  chrome.runtime.sendMessage(
    {
      type: "GREETINGS",
      payload: {
        message: "Hello, my name is Pop. I am from Popup.",
      },
    },
    (response) => {
      console.log(response.message);
    }
  );
})();
