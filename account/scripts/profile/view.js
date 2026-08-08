import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";

export class ProfileView {
    constructor(root) {
        this.root = root;
        this.sections = [
            {
                title: "Personal information",
                rows: [
                    { field: "full-name", label: "Full Name", id: "full-name" },
                    { field: "birthday", label: "Birthday", id: "birthday" },
                    { field: "gender", label: "Gender", id: "gender" },
                ],
            },
            {
                title: "Contact information",
                rows: [
                    { field: "email", label: "Email", id: "email" },
                    { field: "username", label: "Username", id: "username" },
                    {
                        field: "password",
                        label: "Password",
                        id: "password",
                    },
                ],
            },
        ];
    }
    render(user) {
        if (!this.root || !user) return;
        this.root.innerHTML = this.sections
            .map(
                (section) =>
                    `<section class="profile-section"><div class="profile-card"><h3>${Nesh.Html.escape(section.title)}</h3>${section.rows.map((row) => this.rowHtml(row)).join("")}</div></section>`,
            )
            .join("");
        this.fillValues(user);
        Nesh.Icons.load(this.root);
    }
    rowHtml(row) {
        const valueId = row.id ? ` id="${row.id}"` : "";
        const action = `<button type="button" class="profile-action" aria-label="Edit ${Nesh.Html.escape(row.label)}"><i data-icon="pencil"></i></button>`;
        return `<div class="profile-row" data-field="${Nesh.Html.escape(row.field)}"><span class="profile-label">${Nesh.Html.escape(row.label)}</span><span class="profile-value"${valueId}></span>${action}</div>`;
    }
    fillValues(user) {
        this.setText("#full-name", `${user.name || ""} ${user.surname || ""}`.trim());
        this.setText("#birthday", this.formatDate(user.birthday));
        this.setText("#gender", this.formatGender(user.gender || ""));
        this.setText("#email", user.email || "");
        this.setText("#username", user.username || "");
        this.setText(
            "#password",
            user.has_password ? "••••••••" : "Not set",
        );
    }
    setText(selector, value) {
        const element = this.root.querySelector(selector);
        if (element) element.textContent = value;
    }
    formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    }
    formatGender(value) {
        const gender = String(value).toLowerCase();
        if (!gender) return "";
        return gender.charAt(0).toUpperCase() + gender.slice(1);
    }
}
