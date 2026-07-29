export default class Footer {
    constructor() {
        this.year = new Date().getFullYear();
    }
    render() {
        return `
            <footer>
                <div class="container">
                    <p>
                        © ${this.year} iElectro
                    </p>
                </div>
            </footer>
        `;
    }
}