import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import Alert from "../alert/alert.js";
export default class Sidebar {
   static URL = "https://account.ielectro.com";
   constructor() {
        this.create();
        this.activateCurrentPage();
        this.auth();
    }
   create() {
        document.body.insertAdjacentHTML("afterbegin", `
            <nav class="sidebar">
                <img src="${Sidebar.URL}/assets/brand/logo.png" class="logo">
               <ul>
                    <li><a href="${Sidebar.URL}/">Home</a></li>
                    <li><a href="${Sidebar.URL}/profile">Profile</a></li>
                    <li><a href="${Sidebar.URL}/security">Security</a></li>
                    <li><a href="${Sidebar.URL}/activity">Activity</a></li>
                </ul>
            </nav>
        `);
    }
   activateCurrentPage() {
       let page = window.location.pathname
            .replace(/\/$/, "")
            .split("/")
            .pop() || "index";
       if (page === "devices") {
            page = "security";
        }
       document.querySelectorAll(".sidebar a").forEach(link => {
           const href = link.getAttribute("href");
            if (!href) {
                return;
            }
           const target = href
                .replace(/\/$/, "")
                .split("/")
                .pop() || "index";
           if (target === page) {
                link.classList.add("active");
                link.removeAttribute("href");
            }
       });
    }
   async auth() {
       const list = document.querySelector(".sidebar ul");
       if (await Nesh.Auth.logged()) {
           list.insertAdjacentHTML(
                "beforeend",
                `<li><a href="#" class="logout">Log out</a></li>`
            );
           document.querySelector(".logout").addEventListener("click", async (event) => {
               event.preventDefault();
               if (!await Alert.confirm("Are you sure you want to log out?")) {
                    return;
                }
               try {
                   await Nesh.Request.get("auth/logout");
                   window.location.href =
                        `${Sidebar.URL}/login?service=account`;
               } catch (error) {
                   Alert.error(error.text ?? error.message ?? "Unknown error");
               }
           });
           return;
        }
       list.insertAdjacentHTML(
            "beforeend",
            `<li><a href="${Sidebar.URL}/login?service=account">Login</a></li>`
        );
    }
}