export const articleState = { role: "guest" };

export function setArticleState(role) {
    articleState.role = role;
}

export function getArticleState() {
    return articleState.role;
}
