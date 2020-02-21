const PskBindableModel = require("psk-bindable-model");

export default class BaseController {

    constructor(element) {
        this._element = element;
        this.setModel = PskBindableModel.setModel;

        this.__initGetModelEventListener();
    }

    __initGetModelEventListener() {
        this._element.addEventListener("getModelEvent", (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();

            let { bindValue, callback } = e.detail;

            if (typeof callback === "function") {
                if (bindValue && this.model[bindValue]) {
                    callback(null, this.model[bindValue])
                }

                if (!bindValue) {
                    callback(null, this.model);
                }
            }
            callback(new Error("No callback provided"));
        });
    }
}