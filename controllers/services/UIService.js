const SpinnerHTML = "<div class=\"loader-container\">\n" +
    "<div class=\"sk-cube-grid\">\n" +
    "    <div class=\"sk-cube sk-cube1\"></div>\n" +
    "    <div class=\"sk-cube sk-cube2\"></div>\n" +
    "    <div class=\"sk-cube sk-cube3\"></div>\n" +
    "    <div class=\"sk-cube sk-cube4\"></div>\n" +
    "    <div class=\"sk-cube sk-cube5\"></div>\n" +
    "    <div class=\"sk-cube sk-cube6\"></div>\n" +
    "    <div class=\"sk-cube sk-cube7\"></div>\n" +
    "    <div class=\"sk-cube sk-cube8\"></div>\n" +
    "    <div class=\"sk-cube sk-cube9\"></div>\n" +
    "</div>\n" +
    "</div>";

function Spinner(view) {

    let attachedSpinner = null;
    this.attachToView = function () {
        let element = document.createElement("div");
        attachedSpinner = view.appendChild(element);
        attachedSpinner.innerHTML = SpinnerHTML;
    };

    this.removeFromView = function () {
        if (attachedSpinner) {
            attachedSpinner.remove();
        }
    }
}

function prepareView(page_labels){
	try {
		page_labels.forEach(page_label => {
			let labelAttribute = "innerHTML";
			if (page_label.attribute) {
				labelAttribute = page_label.attribute;
			}
			let labelIdentifier = Object.keys(page_label).find((prop) => {
				return prop !== "attribute";
			});
			document.querySelector(labelIdentifier)[labelAttribute] = page_label[labelIdentifier]
		})
	}
	catch (e) {
		console.log(e);
	}
}

export {Spinner, prepareView};

