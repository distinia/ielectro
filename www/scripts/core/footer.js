import { Site } from "./site.js";

export class Footer {
    constructor() {
        this.year = new Date().getFullYear();
    }
    render() {
        return `
            <footer class="site-footer">
                <div class="container">
                    <div class="footer-grid">
                        <div class="footer-brand">
                            <a class="footer-logo" href="${Site.href("/")}" translate="no">iElectro</a>
                            <p>Privacy-first apps and platforms for people and teams worldwide.</p>
                        </div>
                        <div class="footer-col">
                            <h3>Product</h3>
                            <a href="${Site.href("/services")}">Services</a>
                            <a href="https://dyscover.ielectro.com">Dyscover</a>
                            <a href="https://account.ielectro.com">Account</a>
                        </div>
                        <div class="footer-col">
                            <h3>Company</h3>
                            <a href="${Site.href("/team")}">Team</a>
                            <a href="${Site.href("/careers")}">Careers</a>
                        </div>
                        <div class="footer-col">
                            <h3>Contact</h3>
                            <a href="mailto:ielectrocompany@gmail.com">ielectrocompany@gmail.com</a>
                            <span>Bergamo, Italy</span>
                            <div class="footer-social">
                                <a href="https://www.instagram.com/ielectroooo" target="_blank" rel="noopener">Instagram</a>
                                <a href="https://www.tiktok.com/@ielectroo" target="_blank" rel="noopener">TikTok</a>
                                <a href="https://www.youtube.com/channel/UCrNfXr2xLFGgfCVjVfjawMA" target="_blank" rel="noopener">YouTube</a>
                            </div>
                        </div>
                    </div>
                    <div class="footer-bottom">
                        <p>© ${this.year} iElectro</p>
                    </div>
                </div>
            </footer>
        `;
    }
}
