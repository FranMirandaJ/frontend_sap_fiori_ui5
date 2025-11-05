sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/library",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Text",
  "sap/ui/core/Fragment"
], (Controller, JSONModel, Filter, FilterOperator, Dialog, Button, library,MessageBox, MessageToast, Text, Fragment) => {
  "use strict";

  const ButtonType = library.ButtonType;

  return Controller.extend("com.itt.ztgruposet.frontendztgruposet.controller.ZTGRUPOSET", {

    onInit() {
      this._loadData(); // <- carga inicial
      this.getView().setModel(new JSONModel({}), "updateModel");// modelo para operaciones de update/create
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
        this.onSelectionChange(); // deshabilita botones
      }
    },

      onSelectionChange: function () {
      const item = this.byId("tblGrupos").getSelectedItem();
      const rec  = item ? item.getBindingContext("grupos").getObject() : null;

      this.byId("btnEdit").setEnabled(!!rec);
      this.byId("btnDelete").setEnabled(!!rec);
      this.byId("btnDeactivate").setEnabled(!!rec && rec.ACTIVO === true);
      this.byId("btnActivate").setEnabled(!!rec && rec.ACTIVO === false);
    },

    onRowPress: function (oEvent) {
      const rec = oEvent.getSource().getBindingContext("grupos").getObject();
      // abrir diálogo de edición, etc.
    },

        // === Helper: obtener el registro seleccionado de la tabla ===
    _getSelectedRecord: function () {
      const oTable = this.byId("tblGrupos");
      const oItem = oTable.getSelectedItem();
      if (!oItem) return null;
      return oItem.getBindingContext("grupos").getObject();
    },

    // === Helper: construir el payload que espera tu API ===
    _buildDeletePayload: function (rec) {
      // El backend (en tu screenshot) espera exactamente estas claves:
      return {
        "IDSOCIEDAD": rec.IDSOCIEDAD,
        "IDCEDI":     rec.IDCEDI,
        "IDETIQUETA": rec.IDETIQUETA,
        "IDVALOR":    rec.IDVALOR,
        "IDGRUPOET":  rec.IDGRUPOET,
        "ID":         rec.ID
      };
    },

  // === Acción: DESACTIVAR (Delete lógico) ===
    onDeactivePress: async function () {
      const rec = this._getSelectedRecord();
      if (!rec) {
        MessageToast.show("Selecciona un registro primero.");
        return;
    }

    const url = "/api/security/gruposet/crud?ProcessType=DeleteOne&DBServer=MongoDB&LoggedUser=FMIRANDAJ";
    const payload = this._buildDeletePayload(rec);

      const doCall = async () => {
        this.getView().setBusy(true);
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error("HTTP " + res.status);

          // Éxito
          MessageToast.show("Registro desactivado correctamente.");
          await this._loadData(); // recarga la tabla
        } catch (e) {
          MessageBox.error("No se pudo desactivar: " + e.message);
          // console.error(e); // si quieres ver detalle en consola
        } finally {
          this.getView().setBusy(false);
        }
      };

    MessageBox.confirm(
      `¿Desactivar el grupo "${rec.IDETIQUETA}" (ID ${rec.ID})?`,
      {
        title: "Confirmar desactivación",
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        onClose: (act) => { if (act === MessageBox.Action.OK) doCall(); }
      }
      );
    },
    //activar con updateOne ///////////

    onActivePress: async function () {
      const rec = this._getSelectedRecord();
      if (!rec) { sap.m.MessageToast.show("Selecciona un registro."); return; }

      const url = "/api/security/gruposet/crud?ProcessType=UpdateOne&DBServer=mongodb&LoggedUser=FMIRANDAJ";

      // Llaves + campos a actualizar
      const payload = {
        ...this._buildDeletePayload(rec),   // IDSOCIEDAD, IDCEDI, IDETIQUETA, IDVALOR, IDGRUPOET, ID
        data: {
          ACTIVO: true,
          BORRADO: false
          // Puedes agregar auditoría si tu backend la usa:
          // FECHAULTMOD: this._todayStr(), HORAULTMOD: this._timeStr(), USUARIOMOD: "FMIRANDAJ"
        }
      };

      this.getView().setBusy(true);
      try {
        const res  = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error("HTTP " + res.status + (json.messageUSR ? " - " + json.messageUSR : ""));

        sap.m.MessageToast.show("Registro ACTIVADO.");
        await this._loadData();
        this.byId("tblGrupos").removeSelections(true);
        this.onSelectionChange();
      } catch (e) {
        sap.m.MessageBox.error("No se pudo activar: " + e.message);
      } finally {
        this.getView().setBusy(false);
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
                const oRec = this._getSelectedRecord(); // Usa la función de tu compañero
                if (!oRec) {
                    MessageToast.show("Selecciona un registro para editar.");
                    return;
                }

                // 1. Copia los datos de la fila al modelo "updateModel"
                const oUpdateModel = this.getView().getModel("updateModel");
                oUpdateModel.setData(Object.assign({}, oRec)); // Hacemos una copia

                // 2. Abre el Fragmento (el pop-up)
                this._getUpdateDialog().then(oDialog => {
                    oDialog.open();
                });
            },

    onSaveUpdate: async function () {
            const oView = this.getView();
            const oUpdateModel = oView.getModel("updateModel");
            const oRecActualizado = oUpdateModel.getData(); // Datos del formulario

            // URL del endpoint de Update (¡igual al de "Activar" de tu compañero!)
            const url = "/api/security/gruposet/crud?ProcessType=UpdateOne&DBServer=mongodb&LoggedUser=FMIRANDAJ";

            // Construimos el Payload (igual al de "Activar")
            const payload = {
                ...this._buildDeletePayload(oRecActualizado), // Las 6 llaves (IDSOCIEDAD, IDCEDI, etc.)
                data: {
                    INFOAD: oRecActualizado.INFOAD // El único campo que queremos actualizar
                    // ... aquí puedes añadir campos de auditoría si los necesitas
                    // USUARIOMOD: "FMIRANDAJ",
                }
            };

            oView.setBusy(true);
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error("HTTP " + res.status);

                MessageToast.show("Registro actualizado correctamente.");
                this._getUpdateDialog().then(oDialog => oDialog.close()); // Cierra el pop-up
                await this._loadData(); // Recarga la tabla
                
            } catch (e) {
                MessageBox.error("No se pudo actualizar: " + e.message);
            } finally {
                oView.setBusy(false);
            }
        },

        // (Esta es la función para el botón "Cancelar" del pop-up)
        onCancelUpdate: function () {
            this.getView().getModel("updateModel").setData({}); 

            this._getUpdateDialog().then(oDialog => {
                oDialog.close();
            });
        },

        // (Esta es una función "Helper" que carga el Fragmento XML)
        _getUpdateDialog: function () {
            if (!this._oUpdateDialog) {
                this._oUpdateDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.itt.ztgruposet.frontendztgruposet.view.fragments.UpdateDialog",
                    controller: this
                }).then(oDialog => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            return this._oUpdateDialog;
        },

    onDeletePress: function () {
      const rec = this._getSelectedRecord();
      if (!rec) {
        sap.m.MessageToast.show("Selecciona un registro primero.");
        return;
      }

      // Usa el mismo casing que en GetAll: 'Mongodb' o 'MongoDB'
      const url = "/api/security/gruposet/crud?ProcessType=DeleteHard&DBServer=Mongodb&LoggedUser=FMIRANDAJ";
      const payload = this._buildDeletePayload(rec);

      sap.m.MessageBox.warning(
        `Vas a ELIMINAR físicamente el grupo "${rec.IDETIQUETA}" (ID ${rec.ID}).\nEsta acción no se puede deshacer.\n\n¿Continuar?`,
        {
          title: "Confirmar eliminación definitiva",
          actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
          emphasizedAction: sap.m.MessageBox.Action.OK,
          onClose: async (act) => {
            if (act !== sap.m.MessageBox.Action.OK) return;

            this.getView().setBusy(true);
            try {
              const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)          // ← si tu API acepta solo llaves, ver nota abajo
              });
              const json = await res.json().catch(()=>({}));
              if (!res.ok) throw new Error("HTTP " + res.status + (json.messageUSR ? " - " + json.messageUSR : ""));

              sap.m.MessageToast.show("Registro eliminado definitivamente.");
              await this._loadData();
              this.byId("tblGrupos").removeSelections(true);
              this.onSelectionChange(); // deshabilita botones
            } catch (e) {
              sap.m.MessageBox.error("No se pudo eliminar: " + e.message);
            } finally {
              this.getView().setBusy(false);
            }
          }
        }
      );
    },

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
