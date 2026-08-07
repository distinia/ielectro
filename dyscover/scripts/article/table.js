import { Alert } from "../core/index.js";
import { Select } from "./select.js";
import { Menu } from "./menu.js";
import { GenerateArticle } from "./generate-article.js";
import { Paragraph } from "./paragraph.js";
export class Table {
    static list = new Map();
    static tag = "table";
    static className = "table";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.thead = element.querySelector("thead");
        this.tbody = element.querySelector("tbody");
        this.rows = this.tbody?.rows.length || 0;
        this.columns = this.thead?.rows[0]?.cells.length || 0;
        this.menuActions = [
            {
                name: "Add row up",
                action: this.addRowUp,
            },
            {
                name: "Add row down",
                action: this.addRowDown,
            },
            {
                name: "Delete row",
                action: this.removeRow,
            },
            {
                name: "Add column left",
                action: this.addColumnLeft,
            },
            {
                name: "Add column right",
                action: this.addColumnRight,
            },
            {
                name: "Delete column",
                action: this.removeColumn,
            },
            {
                name: "Delete table",
                action: this.delete,
            },
        ];
        this.menu = new Menu(this);
        this.rowsStyle();
        Table.list.set(this.element, this);
    }
    static async init() {
        const range = Select.cursor();
        const parent = Select.tag();
        if (!range || !parent) {
            return;
        }
        const rows = parseInt(await Alert.prompt("Insert number of rows"));
        const columns = parseInt(await Alert.prompt("Insert number of columns"));
        if (!(rows > 0 && columns > 0)) {
            Alert.error("Rows and columns must be greater than 0");
            return;
        }
        const element = Table.create(rows, columns);
        Paragraph.newLine(parent, element);
        const instance = new Table(element);
        instance.startEditing();
    }
    static create(rows = 1, columns = 1) {
        const table = document.createElement(Table.tag);
        table.classList.add(Table.className);
        table.contentEditable = false;
        const thead = document.createElement("thead");
        const trHead = document.createElement("tr");
        for (let j = 0; j < columns; j++) {
            const th = document.createElement("th");
            th.innerHTML = "<br>";
            trHead.appendChild(th);
        }
        thead.appendChild(trHead);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        for (let i = 0; i < rows; i++) {
            const tr = document.createElement("tr");
            for (let j = 0; j < columns; j++) {
                const td = document.createElement("td");
                td.innerHTML = "<br>";
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        return table;
    }
    generate(obj) {
        const element = Table.create(obj.rows.length, obj.headers.length);
        const headers = element.querySelectorAll("th");
        obj.headers.forEach((cell, i) => {
            GenerateArticle.addChildren(headers[i], cell);
        });
        const rows = element.querySelectorAll("tbody tr");
        obj.rows.forEach((row, i) => {
            row.forEach((cell, j) => {
                GenerateArticle.addChildren(rows[i].cells[j], cell);
            });
        });
        return new Table(element);
    }
    export() {
        return {
            element: Table.className,
            headers: [...this.element.querySelectorAll("thead th")].map(th => GenerateArticle.exportChildren(th)),
            rows: [...this.element.querySelectorAll("tbody tr")].map(row => [...row.cells].map(cell => GenerateArticle.exportChildren(cell)))
        };
    }
    startEditing() {
        this.element.contentEditable = false;
        this.editableElements = this.element.querySelectorAll("th, td");
        this.editableElements.forEach((element) => {
            element.contentEditable = true;
        });
        this.menu.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.editableElements) {
            this.editableElements.forEach((element) => {
                element.contentEditable = false;
            });
        }
        this.menu.closeEditing();
    }
    rowsStyle() {
        [...this.tbody.rows].forEach((row, i) => {
            row.classList.toggle("row-even", i % 2 === 1);
            row.classList.toggle("row-odd", i % 2 === 0);
        });
    }
    position() {
        const range = Select.cursor();
        const element = Select.tag(range);
        if (!element) {
            return null;
        }
        const rowElement = element.closest("tr");
        const cellElement = element.closest("td");
        if (!rowElement || !cellElement) {
            return null;
        }
        return {
            row: Array.from(this.tbody.rows).indexOf(rowElement),
            column: Array.from(rowElement.cells).indexOf(cellElement),
        };
    }
    addRowUp() {
        const position = this.position();
        if (!position) return;
        const row = this.tbody.insertRow(position.row);
        for (let j = 0; j < this.columns; j++) {
            row.insertCell(j).innerHTML = "<br>";
        }
        this.rows++;
        this.rowsStyle();
    }
    addRowDown() {
        const position = this.position();
        if (!position) return;
        const row = this.tbody.insertRow(position.row + 1);
        for (let j = 0; j < this.columns; j++) {
            row.insertCell(j).innerHTML = "<br>";
        }
        this.rows++;
        this.rowsStyle();
    }
    removeRow() {
        const position = this.position();
        if (!position) return;
        if (this.rows <= 1) {
            Alert.error("At least one row must remain");
            return;
        }
        this.tbody.deleteRow(position.row);
        this.rows--;
        this.rowsStyle();
    }
    addColumnLeft() {
        const position = this.position();
        if (!position) return;
        for (let i = 0; i < this.rows; i++) {
            this.tbody.rows[i].insertCell(position.column).innerHTML = "<br>";
        }
        const th = document.createElement("th");
        this.thead.rows[0].insertBefore(
            th,
            this.thead.rows[0].cells[position.column],
        );
        this.columns++;
    }
    addColumnRight() {
        const position = this.position();
        if (!position) return;
        for (let i = 0; i < this.rows; i++) {
            this.tbody.rows[i].insertCell(position.column + 1).innerHTML = "<br>";
        }
        const th = document.createElement("th");
        this.thead.rows[0].insertBefore(
            th,
            this.thead.rows[0].cells[position.column + 1],
        );
        this.columns++;
    }
    removeColumn() {
        const position = this.position();
        if (!position) return;
        if (this.columns <= 1) {
            Alert.error("At least one column must remain");
            return;
        }
        this.thead.rows[0].deleteCell(position.column);
        for (let i = 0; i < this.rows; i++) {
            this.tbody.rows[i].deleteCell(position.column);
        }
        this.columns--;
    }
    delete() {
        this.closeEditing();
        Table.list.delete(this.element);
        this.element.remove();
    }
}
