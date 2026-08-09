import { Alert, Auth, UsersList } from "../core/index.js";
import { Actions } from "./actions.js";
import { Informations } from "./informations.js";

export class List {
    constructor(type, data, canManage = false, page = null) {
        this.type = type;
        this.data = Array.isArray(data) ? data : [];
        this.canManage = canManage;
        this.page = page;
        this.open();
    }

    open() {
        const actionLabel = this.canManage
            ? (user) => {
                  if (this.type === "followers") {
                      return user.viewer_following ? "Remove" : "Follow back";
                  }
                  if (this.type === "followings") {
                      return "Unfollow";
                  }
                  return null;
              }
            : null;
        const list = new UsersList({
            title: this.type === "followers" ? "Followers" : "Following",
            searchable: true,
            actionLabel,
            loadUsers: async (term) => {
                const q = term.trim().toLowerCase();
                if (!q) return this.data;
                return this.data.filter((u) =>
                    String(u.username || "")
                        .toLowerCase()
                        .includes(q),
                );
            },
            onSelect: (user) => {
                window.location.href = `https://dyscover.ielectro.com/users/${encodeURIComponent(user.username)}`;
            },
            onAction: this.canManage
                ? async (user, row) => {
                      const actions = new Actions(this.page);
                      const me = await Auth.username();
                      if (this.type === "followers" && me === this.page?.username) {
                          if (user.viewer_following) {
                              await actions.removeFollower(user.id, () => {
                                  row.remove();
                                  this.data = this.data.filter(
                                      (entry) =>
                                          Number(entry.id) !== Number(user.id),
                                  );
                              });
                              return;
                          }
                          await actions.followUser(user.id, () => {
                              user.viewer_following = true;
                              const btn = row.querySelector(".users-list-action");
                              if (btn) {
                                  btn.textContent = "Remove";
                                  btn.classList.remove(
                                      "users-list-action--follow-back",
                                  );
                              }
                              Informations.refresh(this.page);
                          });
                          return;
                      }
                      if (this.type === "followings" && me === this.page?.username) {
                          await actions.unfollowUser(user.id, () => {
                              row.remove();
                              this.data = this.data.filter(
                                  (entry) => Number(entry.id) !== Number(user.id),
                              );
                              Informations.refresh(this.page);
                          });
                      }
                  }
                : null,
        });
        list.open();
    }
}
