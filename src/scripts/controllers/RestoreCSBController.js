import RestoreCSBEvent from "../events/RestoreCSBEvent.js";

export default class RestoreCSBController {

    wizardSteps = [{
        stepName: "FirstStep",
        stepIndex: 1,
        stepComponent: "psk-page-loader",
        stepCompleted: false,
        stepProperties: {pageUrl: "/pages/wizard/restore/init.html"}
    },
        {
            stepName: "SecondStep",
            stepIndex: 2,
            stepComponent: "psk-page-loader",
            stepCompleted: false,
            stepProperties: {pageUrl: "/pages/wizard/restore/details.html"}
        },
        {
            stepName: "ThirdStep",
            stepIndex: 3,
            stepComponent: "psk-page-loader",
            stepCompleted: false,
            stepProperties: {pageUrl: "Hello"}
        }];

    provideConfiguration(event) {
        let callback = event.detail;

        if (typeof callback === "function") {
            callback(this.wizardSteps);
        } else {
            console.error("No callback was provided for needWizardConfiguration event");
        }
    }

    changeStep(event) {
        if (typeof event.data.callback === "function") {
            let callback = event.data.callback;
            let nextStepIndex = event.data.stepIndexToDisplay;
            let wizardSteps = event.data.wizardSteps;
            let currentStep = event.data.activeStep;


            if (currentStep.stepIndex === 1) {

                let restoreCSBEvent = new RestoreCSBEvent("restoreCSB", {
                    callback: () => {
                        if (0 <= nextStepIndex <= wizardSteps.length) {
                            let desiredStep = wizardSteps.find((step) => {
                                return step.stepIndex === nextStepIndex;
                            });
                            if (desiredStep) {
                                callback(null, {
                                    activeStep: desiredStep,
                                    wizardSteps: wizardSteps
                                })
                            }
                        }
                        else {
                            callback(new Error("Step index out of rance"));
                        }
                    }
                });

                this.element.dispatchEvent(restoreCSBEvent)
            }


        }
    }

    constructor(element) {
        this.element = element;
        console.log("RestoreCSBController created!");
        element.addEventListener("needWizardConfiguration", this.provideConfiguration.bind(this))
        element.addEventListener("changeStep", this.changeStep.bind(this));
    }

    restoreCSB(seed) {
        console.log(seed);
        throw new Error("Not implemented")
    }

}
