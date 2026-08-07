import { Alert, Auth, UsersList } from "../core/index.js";
import { Actions } from "./actions.js";
export class List {
    constructor(type, data, canManage = false) {
        this.type = type;
        this.data = Array.isArray(data) ? data : [];
        this.canManage = canManage;
        this.open();
    }
    open() {
        const actionLabel = this.canManage
            ? this.type === "followers"
                ? "Remove Follower"
                : "Unfollow"
            : null;
        const list = new UsersList({
            title: this.type === "followers" ? "Followers" : "Followings",
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
                window.location.href = `https://dyscover.ielectro.com/u/${encodeURIComponent(user.username)}`;
            },
            onAction: this.canManage
                ? async (user, row) => {
                      const actions = new Actions(user.username);
                      const me = await Auth.username();
                      if (this.type === "followers" && me === currentUsername) {
                          const ok = await Alert.confirm("Remove follower?");
                          if (ok) {
                              await actions.removeFollower();
                              row.remove();
                          }
                      } else {
                          actions.unfollow();
                          row.remove();
                      }
                  }
                : null,
        });
        list.open();
    }
}
