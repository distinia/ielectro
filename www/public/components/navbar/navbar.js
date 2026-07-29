export default class Navbar {
   static URL = "https://www.ielectro.com";
   render() {
        return `
            <nav>
                <div class="container">
                    <div class="nav-content">
                        <div class="logo" translate="no">
                            iElectro
                        </div>
                        <div class="nav-links">
                            <a href="${Navbar.URL}/">
                                Home
                            </a>
                            <a href="${Navbar.URL}/services">
                                Services
                            </a>
                            <a href="${Navbar.URL}/team">
                                Team
                            </a>
                            <a href="${Navbar.URL}/careers">
                                Careers
                            </a>
                            <a href="${Navbar.URL}/news">
                                News
                            </a>
                            <a href="${Navbar.URL}/contact-us">
                                Contact us
                            </a>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }
}
