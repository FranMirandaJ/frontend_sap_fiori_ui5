sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/IconPool",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/library",
    "sap/m/MessageToast",
    "sap/m/Text"
], (Controller, JSONModel, IconPool, Dialog, Button, library, MessageToast, Text) => {
    "use strict";

    const ButtonType = library.ButtonType;

    return Controller.extend("com.itt.ztgruposet.frontendztgruposet.controller.ZTGRUPOSET", {

        onInit() {
        },

        onCollapseExpandPress() {
            const oSideNavigation = this.byId("sideNavigation"),
                bExpanded = oSideNavigation.getExpanded();

            oSideNavigation.setExpanded(!bExpanded);
        },

        onSideNavItemSelect(oEvent) {
            const oItem = oEvent.getParameter("item"),
                sText = oItem.getText();
            if (sText === "") return; // icono de las 3 barritas en sideNavigation
            MessageToast.show(`Item selected: ${sText}`);
        },

        // onCreatePress(oEvent){
        //     MessageToast.show("Abriendo formulario de creación...");
        // },

        onCreatePress: function () {
            if (!this.oDefaultDialog) {
                this.oDefaultDialog = new Dialog({
                    title: "Agregar grupo de SKU",
                    content: new Text({ text: "Form para crear un grupo" }),
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "Guardar",
                        press: function () {
                            this.oDefaultDialog.close();
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: "Cancelar",
                        press: function () {
                            this.oDefaultDialog.close();
                        }.bind(this)
                    })
                });

                // to get access to the controller's model
                this.getView().addDependent(this.oDefaultDialog);
            }

            this.oDefaultDialog.open();
        },

        // onEditPress(oEvent) {
        //     MessageToast.show("Abriendo formulario de edición...");
        // },

        onEditPress: function () {
            if (!this.oDefaultDialog) {
                this.oDefaultDialog = new Dialog({
                    title: "Editar grupo de SKU",
                    content: new Text({ text: "Form para editar un grupo" }),
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "Guardar",
                        press: function () {
                            this.oDefaultDialog.close();
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: "Cancelar",
                        press: function () {
                            this.oDefaultDialog.close();
                        }.bind(this)
                    })
                });

                // to get access to the controller's model
                this.getView().addDependent(this.oDefaultDialog);
            }

            this.oDefaultDialog.open();
        },

        onDeletePress(oEvent) {
            MessageToast.show("Btn borrar presionado...");
        },

        onDeactivePress(oEvent) {
            MessageToast.show("Btn desactivar presionado...");
        },

        onActivePress(oEvent) {
            MessageToast.show("Btn activar presionado...");
        },

        onSearchPress(oEvent) {
            MessageToast.show(`Buscando la palabra "${oEvent.getSource().getValue()}" ...`);
        },

    });
});