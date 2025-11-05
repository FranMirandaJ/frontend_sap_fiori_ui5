sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/library",
  "sap/m/MessageToast",
  "sap/m/Text"
], (Controller, JSONModel, Filter, FilterOperator, Dialog, Button, library, MessageToast, Text) => {
  "use strict";

  const ButtonType = library.ButtonType;

  return Controller.extend("com.itt.ztgruposet.frontendztgruposet.controller.ZTGRUPOSET", {

    onInit() {
      this._loadData(); // <- carga inicial
    },

    // ==== CARGA DE DATOS DESDE CAP/CDS (POST) ====
    _loadData: async function () {
      const oView = this.getView();
      oView.setBusy(true);
      try {
        // Usa el proxy del ui5.yaml: /api -> http://localhost:4004
        const url = "/api/security/gruposet/crud?ProcessType=GetAll&DBServer=Mongodb&LoggedUser=FMIRANDAJ";

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
          // body: JSON.stringify({}) // si tu endpoint lo requiere, descomenta
        });
        if (!res.ok) throw new Error("HTTP " + res.status);

        const json = await res.json();

        // Los registros vienen en data[0].dataRes
        const items = (((json || {}).data || [])[0] || {}).dataRes || [];

        // Normaliza/deriva campos útiles para la UI
        const normalized = items.map(x => ({
          _id: x._id,
          IDSOCIEDAD: x.IDSOCIEDAD,
          IDCEDI: x.IDCEDI,
          IDETIQUETA: x.IDETIQUETA,
          IDVALOR: x.IDVALOR,
          IDGRUPOET: x.IDGRUPOET,
          ID: x.ID,
          INFOAD: x.INFOAD,
          FECHAREG: x.FECHAREG,
          HORAREG: x.HORAREG,
          USUARIOREG: x.USUARIOREG,
          ACTIVO: x.ACTIVO,
          BORRADO: x.BORRADO,
          EstadoTxt: x.ACTIVO ? "ACTIVO" : "INACTIVO",
          EstadoUI5: x.ACTIVO ? "Success" : "Error"
        }));

        this.getView().setModel(new JSONModel({ items: normalized }), "grupos");
      } catch (e) {
        MessageToast.show("Error cargando datos: " + e.message);
      } finally {
        oView.setBusy(false);
      }
    },

    onRefreshPress() {
      this._loadData();
    },

    // ==== UI LAYOUT ====
    onCollapseExpandPress() {
      const oSideNavigation = this.byId("sideNavigation"),
        bExpanded = oSideNavigation.getExpanded();
      oSideNavigation.setExpanded(!bExpanded);
    },

    onSideNavItemSelect(oEvent) {
      const oItem = oEvent.getParameter("item"),
        sText = oItem.getText();
      if (sText === "") return;
      MessageToast.show(`Item selected: ${sText}`);
    },

    // ==== ACCIONES (crear/editar) – placeholders ====
    onCreatePress: function () {
      if (!this.oDefaultDialog) {
        this.oDefaultDialog = new Dialog({
          title: "Agregar grupo de SKU",
          content: new Text({ text: "Form para crear un grupo" }),
          beginButton: new Button({
            type: ButtonType.Emphasized,
            text: "Guardar",
            press: function () { this.oDefaultDialog.close(); }.bind(this)
          }),
          endButton: new Button({
            text: "Cancelar",
            press: function () { this.oDefaultDialog.close(); }.bind(this)
          })
        });
        this.getView().addDependent(this.oDefaultDialog);
      }
      this.oDefaultDialog.open();
    },

    onEditPress: function () {
      if (!this.oDefaultDialog) {
        this.oDefaultDialog = new Dialog({
          title: "Editar grupo de SKU",
          content: new Text({ text: "Form para editar un grupo" }),
          beginButton: new Button({
            type: ButtonType.Emphasized,
            text: "Guardar",
            press: function () { this.oDefaultDialog.close(); }.bind(this)
          }),
          endButton: new Button({
            text: "Cancelar",
            press: function () { this.oDefaultDialog.close(); }.bind(this)
          })
        });
        this.getView().addDependent(this.oDefaultDialog);
      }
      this.oDefaultDialog.open();
    },

    onDeletePress() { MessageToast.show("Btn borrar presionado..."); },
    onDeactivePress() { MessageToast.show("Btn desactivar presionado..."); },
    onActivePress() { MessageToast.show("Btn activar presionado..."); },

    // ==== BUSCADOR (SearchField liveChange/search) ====
    onSearchPress(oEvent) {
      const sQuery = oEvent.getParameter("query") || oEvent.getSource().getValue();
      const oBinding = this.byId("tblGrupos").getBinding("items");
      if (!oBinding) return;

      if (!sQuery) { oBinding.filter([]); return; }

      const aFilters = [
        new Filter("IDETIQUETA", FilterOperator.Contains, sQuery),
        new Filter("IDVALOR",   FilterOperator.Contains, sQuery),
        new Filter("IDSOCIEDAD",FilterOperator.Contains, sQuery),
        new Filter("IDCEDI",    FilterOperator.Contains, sQuery),
        new Filter("INFOAD",    FilterOperator.Contains, sQuery),
        new Filter("ID",        FilterOperator.Contains, sQuery)
      ];

      oBinding.filter(new Filter({ filters: aFilters, and: false }));
    }

  });
});
