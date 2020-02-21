import Controller from "./Controller.js";

export default class FormController extends Controller {
    constructor(element) {
        super(element);

        this.__initDefaultFormListeners.call(this);

        document.dispatchEvent(new CustomEvent('modelReady', {
            bubbles: true,
            cancelable: true,
            composed: true
        }));
    }

    __initDefaultFormListeners() {
        this._element.addEventListener('submit', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            console.log('{FormController.js} Form is listening for -=submit=-');
        }, true);

        this._element.addEventListener('reset', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            console.log('{FormController.js} Form is listening for -=reset=-');
        }, true);
    }
}