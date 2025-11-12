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

    formatter: {
      truncateInfoAd: function (sInfo) {
        if (!sInfo) {
          return "";
        }
        const aWords = sInfo.split(" ");
        if (aWords.length > 3) {
          return aWords.slice(0, 3).join(" ") + "...";
        }
        return sInfo;
      }
    },


    onAvatarPressed: function () {
			MessageToast.show("Avatar pressed!");
		},

		onLogoPressed: function () {
			MessageToast.show("Logo pressed!");
		},

    onInit() {
      
      this.getView().setModel(new JSONModel({}), "updateModel");// modelo para operaciones de update/create
      this.getView().setModel(new JSONModel({}), "createModel");
      this.getView().setModel(new JSONModel({ state: false }), "dbServerSwitch"); // contenido del dbServerSwitch
      this.getView().setModel(new JSONModel({ text: "" }), "infoAd"); // Modelo para el popover de Info Adicional
      this._initFilterModel(); // Modelo para el diálogo de filtros

  this.getView().setModel(new JSONModel({
    fullData: [],
    sociedades: [],
    cedis: [],
    etiquetas: [],
    valores: []
  }), "cascadeModel");
      this._aCatalogData = [];

      // Propiedades para la paginación personalizada
      this._aAllItems = [];
      this._aFilteredItems = []; // Items después de filtrar/ordenar
      this._iCurrentPage = 1;
      this._iPageSize = 5;
      this._loadData(); 
      
    },
    
    _initFilterModel: function() {
      const oFilterModel = new JSONModel({
        searchQuery: "",
        fields: [
          { key: "IDSOCIEDAD", text: "Sociedad" },
          { key: "IDCEDI", text: "Sucursal (CEDIS)" },
          { key: "IDETIQUETA", text: "Etiqueta" },
          { key: "IDVALOR", text: "Valor" },
          { key: "IDGRUPOET", text: "Grupo Etiqueta" },
          { key: "ID", text: "ID" }
        ],
        selectedField: "IDETIQUETA", // Campo por defecto para buscar
        selectedFieldIndex: 2, // Índice de "IDETIQUETA"
        sort: {
          fields: [
            { key: "ID", text: "ID" },
            { key: "IDSOCIEDAD", text: "Sociedad" },
            { key: "IDCEDI", text: "Sucursal (CEDIS)" },
            { key: "IDETIQUETA", text: "Etiqueta" },
            { key: "IDGRUPOET", text: "Grupo Etiqueta" },
            { key: "FECHAREG", text: "Fecha de Registro" },
            { key: "FECHAULTMOD", text: "Fecha Última Modificación" },
            { key: "ACTIVO", text: "Estado" }
          ],
          selectedField: "ID", // Campo por defecto para ordenar
          direction: "ASC"
        }
      });
      this.getView().setModel(oFilterModel, "filter");
    },

    // ==== CARGA DE DATOS DESDE CAP/CDS (POST) ====
    _loadData: async function () {
      const oView = this.getView();
      oView.setBusy(true);
      try {
        // Usa el proxy del ui5.yaml: /api -> http://localhost:4004
      const url = this._getApiParams("GetAll");

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) 
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
          FECHAULTMOD: x.FECHAULTMOD,
          HORAULTMOD: x.HORAULTMOD,
          USUARIOMOD: x.USUARIOMOD,
          ACTIVO: x.ACTIVO,
          BORRADO: x.BORRADO,
          EstadoTxt: x.ACTIVO ? "ACTIVO" : "INACTIVO",          
          EstadoUI5: x.ACTIVO ? "Success" : "Error",
          EstadoIcon: x.ACTIVO ? "sap-icon://sys-enter-2" : "sap-icon://status-negative",
          EstadoIconColor: x.ACTIVO ? "Positive" : "Negative",
          RegistroCompleto: `${x.FECHAREG || ''} ${x.HORAREG || ''} (${x.USUARIOREG || 'N/A'})`,
          ModificacionCompleta: x.FECHAULTMOD ? `${x.FECHAULTMOD} ${x.HORAULTMOD} (${x.USUARIOMOD || 'N/A'})` : 'Sin modificaciones'
        }));

        // Guardamos todos los items y configuramos la paginación inicial
        this._aAllItems = normalized;
        this.getView().setModel(new JSONModel(), "grupos"); // Creamos el modelo vacío
        this._applyFiltersAndSort(); // Aplicamos filtros/orden por defecto y mostramos la primera página

      } catch (e) {
        MessageToast.show("Error cargando datos: " + e.message);
      } finally {
        oView.setBusy(false);
        this.onSelectionChange(); // deshabilita botones de acción
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

      _getApiParams: function (sProcessType) { // <-- 1. AÑADIMOS UN PARÁMETRO
                  const oSwitchModel = this.getView().getModel("dbServerSwitch");
                  const bIsAzure = oSwitchModel.getProperty("/state"); 
                  
                  const sDBServer = bIsAzure ? "Azure" : "Mongodb"; 
                  const sLoggedUser = "FMIRANDAJ"; // Asegúrate que este sea el usuario correcto

                  // 2. ¡LA SOLUCIÓN! Usamos la URL completa de Render
                  const sBaseUrl = "https://app-restful-sap-cds.onrender.com/api/security/gruposet/crud";

                  // 3. Devolvemos la URL completa con todos los parámetros
                  return `${sBaseUrl}?ProcessType=${sProcessType}&DBServer=${sDBServer}&LoggedUser=${sLoggedUser}`;
              },

  // === Acción: DESACTIVAR (Delete lógico) ===
    onDeactivePress: async function () {
      const rec = this._getSelectedRecord();
      if (!rec) {
        MessageToast.show("Selecciona un registro primero.");
        return;
    }

      const url = this._getApiParams("DeleteOne");
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

      const url = this._getApiParams("UpdateOne");

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

      const oItem = oEvent.getParameter("item");
      const sKey = oItem.getKey(); // Es mejor usar la clave (key) que el texto

      if (sKey === "configuracion") {
        this._getConfigDialog().then(oDialog => oDialog.open());
      } else {
        MessageToast.show(`Item selected: ${oItem.getText()}`);
      }
    },

    // ==== ACCIONES (crear/editar) – placeholders ====
onCreatePress: async function () {
  await this._loadExternalCatalogData(); // <-- cargar catálogos antes
  this._getCreateDialog().then((oDialog) => {
    oDialog.open();
  });
},


    onSaveCreate: async function () {
      
     const oCreateModel = this.getView().getModel("createModel");
     const oCreate = oCreateModel.getData(); // Datos del formulario
    
    try {
        const payload = {
                IDSOCIEDAD: oCreate.IDSOCIEDAD,
                IDCEDI: oCreate.IDCEDI,
                IDETIQUETA: oCreate.IDETIQUETA,
                IDVALOR: oCreate.IDVALOR,
                IDGRUPOET: oCreate.IDGRUPOET,
                ID:oCreate.ID,
                INFOAD: oCreate.INFOAD,
                ACTIVO: true,
                BORRADO:false 
        };

        const sApiParams = this._getApiParams(); 
        const url = this._getApiParams("Create"); const res = await fetch(url, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (!res.ok || json.error) {
            MessageBox.error(json.error || "No se pudo crear el registro.");
            return;
        }

        MessageToast.show("Grupo creado correctamente.");
          this.getView().getModel("createModel").setData({});
          this._getCreateDialog().then(oDialog => {
                  oDialog.close();
              });
        await this._loadData();

    } catch (error) {
        console.error("Error al crear el grupo:", error);
        MessageBox.error("Error inesperado al crear el grupo.");
    }
},

    
        // (Esta es la función para el botón "Cancelar" del pop-up)
      onCancelCreate: function () {
         this.getView().getModel("createModel").setData({}); 

              this._getCreateDialog().then(oDialog => {
                  oDialog.close();
              });
          },

            _getCreateDialog: function () {
            if (!this._oCreateDialog) {
                this._oCreateDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.itt.ztgruposet.frontendztgruposet.view.fragments.CreateDialog",
                    controller: this
                }).then(oDialog => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            return this._oCreateDialog;
        },

_loadExternalCatalogData: async function () {
  const oView = this.getView();
  const oModel = new sap.ui.model.json.JSONModel({
    sociedades: [],
    cedisAll: [],
    etiquetasAll: [],
    valoresAll: [],
    cedis: [],
    etiquetas: [],
    valores: []
  });
  oView.setModel(oModel, "cascadeModel");

  const oSwitchModel = this.getView().getModel("dbServerSwitch");
const bIsAzure = oSwitchModel.getProperty("/state"); 

// 2. Definimos la base de la API del "otro team" (¡Esto usa el proxy!)
const sBaseUrl = "http://localhost:3034/api/cat/crudLabelsValues";

// 3. Asignamos el DBServer correcto
const sDBServer = bIsAzure ? "CosmosDB" : "MongoDB"; // <-- ¡Aquí está la magia!
const sLoggedUser = "MIGUELLOPEZ";

// 4. Construimos la URL final
const url = `${sBaseUrl}?ProcessType=GetAll&LoggedUser=${sLoggedUser}&DBServer=${sDBServer}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operations: [
          {
            collection: "LabelsValues",
            action: "GETALL",
            payload: {}
          }
        ]
      }),
    });

    const json = await res.json();
    console.log("📥 Respuesta sin parsear:", json);

    const registros = json?.data?.[0]?.dataRes || [];
    console.log("✅ DataRes procesado:", registros);

    if (!Array.isArray(registros) || registros.length === 0) {
      console.warn("⚠️ No se encontraron registros en la respuesta");
      return;
    }

    // 🔹 Construimos listas únicas
    const sociedades = [];
    const cedis = [];
    const etiquetas = [];
    const valores = [];

    registros.forEach((item) => {
      // SOCIEDADES
      if (item.IDSOCIEDAD && !sociedades.some((s) => s.key === item.IDSOCIEDAD)) {
        sociedades.push({
          key: item.IDSOCIEDAD,
          text: `Sociedad ${item.IDSOCIEDAD}`,
        });
      }

      // CEDIS
      if (
        item.IDCEDI &&
        !cedis.some((c) => c.key === item.IDCEDI && c.parentSoc === item.IDSOCIEDAD)
      ) {
        cedis.push({
          key: item.IDCEDI,
          text: `Cedi ${item.IDCEDI}`,
          parentSoc: item.IDSOCIEDAD,
        });
      }

      // ETIQUETAS
      if (item.IDETIQUETA && !etiquetas.some((e) => e.key === item.IDETIQUETA)) {
        etiquetas.push({
          key: item.IDETIQUETA,
          text: item.ETIQUETA || item.IDETIQUETA,
          IDSOCIEDAD: item.IDSOCIEDAD,
          IDCEDI: item.IDCEDI,
        });
      }

      // VALORES anidados
      if (Array.isArray(item.valores)) {
        item.valores.forEach((v) => {
          valores.push({
            key: v.IDVALOR,
            text: v.VALOR,
            IDSOCIEDAD: v.IDSOCIEDAD,
            IDCEDI: v.IDCEDI,
            parentEtiqueta: item.IDETIQUETA,
          });
        });
      }
    });

    console.log("✅ Sociedades cargadas:", sociedades);
    console.log("✅ CEDIS cargados:", cedis);
    console.log("✅ Etiquetas cargadas:", etiquetas);
    console.log("✅ Valores cargados:", valores);

    // 🔹 Actualizamos el modelo
    oModel.setProperty("/sociedades", sociedades);
    oModel.setProperty("/cedisAll", cedis);
    oModel.setProperty("/etiquetasAll", etiquetas);
    oModel.setProperty("/valoresAll", valores);

  } catch (err) {
    console.error("💥 Error al cargar catálogos:", err);
  }
},



        // --- PASO 1: Poblar Sociedades ---
        _populateSociedades: function () {
            const oCascadeModel = this.getView().getModel("cascadeModel");
            // Usamos '...new Set' para obtener valores únicos de la lista maestra
            const aNombresSoc = [...new Set(this._aCatalogData.map(item => item.IDSOCIEDAD))];
            // Filtramos 'undefined' por si algún registro no tiene sociedad
            const aSociedades = aNombresSoc.filter(id => id !== undefined).map(id => ({ key: id, text: id }));
            oCascadeModel.setProperty("/sociedades", aSociedades);
        },

        // --- PASO 2: Evento al cambiar Sociedad ---
      onSociedadChange: function (oEvent) {
  const selectedSoc = oEvent.getSource().getSelectedKey();
  const oCreateModel = this.getView().getModel("createModel");
  const oModel = this.getView().getModel("cascadeModel");

  console.log("✅ Sociedad seleccionada:", selectedSoc);

  // Limpiar combos dependientes
  oCreateModel.setProperty("/IDCEDI", null);
  oCreateModel.setProperty("/IDETIQUETA", null);
  oCreateModel.setProperty("/IDVALOR", null);

  oModel.setProperty("/cedis", []);
  oModel.setProperty("/etiquetas", []);
  oModel.setProperty("/valores", []);

  if (!selectedSoc) return;

  const allCedis = oModel.getProperty("/cedisAll") || [];
  const filteredCedis = allCedis.filter((c) => c.parentSoc == selectedSoc);

  console.log("🟩 CEDIS filtrados:", filteredCedis);
  oModel.setProperty("/cedis", filteredCedis);
},


onCediChange: function (oEvent) {
  const selectedCedi = oEvent.getSource().getSelectedKey();
  const oCreateModel = this.getView().getModel("createModel");
  const selectedSoc = oCreateModel.getProperty("/IDSOCIEDAD");
  const oModel = this.getView().getModel("cascadeModel");

  console.log("✅ CEDI seleccionado:", selectedCedi, "Sociedad:", selectedSoc);

  // Limpiar combos dependientes
  oCreateModel.setProperty("/IDETIQUETA", null);
  oCreateModel.setProperty("/IDVALOR", null);

  oModel.setProperty("/etiquetas", []);
  oModel.setProperty("/valores", []);

  if (!selectedCedi || !selectedSoc) return;

  const allEtiquetas = oModel.getProperty("/etiquetasAll") || [];
  const filteredEtiquetas = allEtiquetas.filter(
    (e) => e.IDSOCIEDAD == selectedSoc && e.IDCEDI == selectedCedi
  );

  console.log("🟩 Etiquetas filtradas:", filteredEtiquetas);
  oModel.setProperty("/etiquetas", filteredEtiquetas);
},

onEtiquetaChange: function (oEvent) {
  const selectedEtiqueta = oEvent.getSource().getSelectedKey();
  const oCreateModel = this.getView().getModel("createModel");
  const selectedSoc = oCreateModel.getProperty("/IDSOCIEDAD");
  const selectedCedi = oCreateModel.getProperty("/IDCEDI");
  const oModel = this.getView().getModel("cascadeModel");

  console.log("✅ Etiqueta seleccionada:", selectedEtiqueta, "Soc:", selectedSoc, "Cedi:", selectedCedi);

  // Limpiar combo dependiente
  oCreateModel.setProperty("/IDVALOR", null);
  oModel.setProperty("/valores", []);

  if (!selectedEtiqueta || !selectedSoc || !selectedCedi) return;

  const allValores = oModel.getProperty("/valoresAll") || [];
  const filteredValores = allValores.filter(
    (v) =>
      v.IDSOCIEDAD == selectedSoc &&
      v.IDCEDI == selectedCedi &&
      v.parentEtiqueta == selectedEtiqueta
  );

  console.log("🟦 Valores filtrados:", filteredValores);
  oModel.setProperty("/valores", filteredValores);
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
            const url = this._getApiParams("UpdateOne");

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

    // ==== DIÁLOGO DE CONFIGURACIÓN ====
    _getConfigDialog: function () {
      if (!this._oConfigDialog) {
          this._oConfigDialog = Fragment.load({
              id: this.getView().getId(),
              name: "com.itt.ztgruposet.frontendztgruposet.view.fragments.ConfigDialog",
              controller: this
          }).then(oDialog => {
              this.getView().addDependent(oDialog);
              return oDialog;
          }).catch(oError => {
              console.error("Error en Fragment.load:", oError);
          });
      }
      return this._oConfigDialog;
    },

    onCancelConfig: function () {
      this._getConfigDialog().then(oDialog => oDialog.close());
    },

    onDbServerChange: function(oEvent) {
            const bState = oEvent.getParameter("state");
            this.getView().getModel("dbServerSwitch").setProperty("/state", bState);

            this._loadData();
    },

    onDeletePress: function () {
      const rec = this._getSelectedRecord();
      if (!rec) {
        sap.m.MessageToast.show("Selecciona un registro primero.");
        return;
      }

      // Usa el mismo casing que en GetAll: 'Mongodb' o 'MongoDB'
      const url = this._getApiParams("DeleteHard");
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

    // ==== LÓGICA DE FILTRADO Y BÚSQUEDA ====
    onSearch: function(oEvent) {
      const sQuery = oEvent.getParameter("query");
      this.getView().getModel("filter").setProperty("/searchQuery", sQuery);
      this._applyFiltersAndSort();
    },

    onFilterPress: function() {
      this._getFilterDialog().then(oDialog => oDialog.open());
    },

    _getFilterDialog: function() {
      if (!this._oFilterDialog) {
        this._oFilterDialog = Fragment.load({
          id: this.getView().getId(),
          name: "com.itt.ztgruposet.frontendztgruposet.view.fragments.FilterDialog",
          controller: this
        }).then(oDialog => {
          // --- INICIO: Lógica para poblar los RadioButtons ---
          const oFilterModel = this.getView().getModel("filter");
          const aFields = oFilterModel.getProperty("/fields");
          const iSelectedIndex = oFilterModel.getProperty("/selectedFieldIndex");
          const oRadioGroup = this.byId("searchFieldGroup");

          oRadioGroup.destroyButtons(); // Limpiamos por si acaso

          aFields.forEach(oField => {
            oRadioGroup.addButton(new sap.m.RadioButton({ text: oField.text }));
          });

          oRadioGroup.setSelectedIndex(iSelectedIndex);
          // --- FIN: Lógica para poblar los RadioButtons ---

          this.getView().addDependent(oDialog);
          return oDialog;
        });
      }
      return this._oFilterDialog;
    },

    onApplyFilters: function() {
      this._applyFiltersAndSort();
      this._getFilterDialog().then(oDialog => oDialog.close());
    },

    onCancelFilters: function() {
      // Opcional: podrías resetear el modelo a su estado anterior si lo guardaste al abrir.
      this._getFilterDialog().then(oDialog => oDialog.close());
    },

    onResetFilters: function() {
      this._initFilterModel(); // Restaura el modelo a su estado inicial
      this.byId("searchField").setValue(""); // Limpia el campo de búsqueda visualmente
      this._applyFiltersAndSort();
      this._getFilterDialog().then(oDialog => oDialog.close());
    },

    onFilterFieldSelect: function(oEvent) {
      const iSelectedIndex = oEvent.getParameter("selectedIndex");
      const oFilterModel = this.getView().getModel("filter");
      const sSelectedKey = oFilterModel.getProperty(`/fields/${iSelectedIndex}/key`);
      oFilterModel.setProperty("/selectedField", sSelectedKey);
    },

    _applyFiltersAndSort: function() {
      const oFilterData = this.getView().getModel("filter").getData();
      const sQuery = oFilterData.searchQuery.toLowerCase();
      let aFiltered = [...this._aAllItems];

      // 1. Aplicar filtro de búsqueda
      if (sQuery) {
        const sSelectedField = oFilterData.selectedField;
        aFiltered = aFiltered.filter(item => {
          return item[sSelectedField] && item[sSelectedField].toString().toLowerCase().includes(sQuery);
        });
      }

      // 2. Aplicar ordenamiento
      const oSortInfo = oFilterData.sort;
      const sSortField = oSortInfo.selectedField;

      aFiltered.sort((a, b) => {
        let valA = a[sSortField];
        let valB = b[sSortField];

        // Manejo para fechas
        if (sSortField === "FECHAREG" && a.FECHAREG) {
          valA = new Date(a.FECHAREG + "T" + a.HORAREG);
        }
        if (sSortField === "FECHAREG" && b.FECHAREG) {
          valB = new Date(b.FECHAREG + "T" + b.HORAREG);
        }
        if (sSortField === "FECHAULTMOD" && a.FECHAULTMOD) {
          valA = new Date(a.FECHAULTMOD + "T" + a.HORAULTMOD);
        }
        if (sSortField === "FECHAULTMOD" && b.FECHAULTMOD) {
          valB = new Date(b.FECHAULTMOD + "T" + b.HORAULTMOD);
        }

        let comparison = 0;
        if (valA > valB) {
          comparison = 1;
        } else if (valA < valB) {
          comparison = -1;
        }

        return (oSortInfo.direction === "DESC") ? (comparison * -1) : comparison;
      });

      // 3. Actualizar datos para paginación
      this._aFilteredItems = aFiltered;
      this._iCurrentPage = 1; // Siempre volver a la primera página después de filtrar
      this._updateTablePage();
    },
  
    // ==== Popover para Información Adicional ====
    _getInfoAdPopover: function () {
      if (!this._oInfoAdPopover) {
        this._oInfoAdPopover = Fragment.load({
          id: this.getView().getId(),
          name: "com.itt.ztgruposet.frontendztgruposet.view.fragments.InfoAdPopover",
          controller: this
        }).then(oPopover => {
          this.getView().addDependent(oPopover);
          return oPopover;
        });
      }
      return this._oInfoAdPopover;
    },

    onInfoAdPress: function(oEvent) {
      const oControl = oEvent.getSource();
      const oContext = oControl.getBindingContext("grupos");
      const sInfoCompleta = oContext.getProperty("INFOAD");
      this.getView().getModel("infoAd").setProperty("/text", sInfoCompleta);
      this._getInfoAdPopover().then(oPopover => oPopover.openBy(oControl));
    },

    // ==== LÓGICA DE PAGINACIÓN PERSONALIZADA ====
    onNavPage: function (oEvent) {
      const sNavDirection = oEvent.getSource().getIcon().includes("right") ? "next" : "prev";

      if (sNavDirection === "next") {
        this._iCurrentPage++;
      } else {
        this._iCurrentPage--;
      }

      this._updateTablePage();
    },

    _updateTablePage: function () {
      const oView = this.getView();
      const iTotalItems = this._aFilteredItems.length;
      const iTotalPages = Math.ceil(iTotalItems / this._iPageSize);

      // Asegurarse de que la página actual esté dentro de los límites
      this._iCurrentPage = iTotalPages === 0 ? 1 : Math.max(1, Math.min(this._iCurrentPage, iTotalPages));

      const iStartIndex = (this._iCurrentPage - 1) * this._iPageSize;
      const iEndIndex = iStartIndex + this._iPageSize;
      const aPageItems = this._aFilteredItems.slice(iStartIndex, iEndIndex);

      // Actualizar el modelo de la tabla con solo los registros de la página actual
      oView.getModel("grupos").setData({ items: aPageItems });

      // Actualizar estado de los botones y texto informativo
      oView.byId("btnPrevPage").setEnabled(this._iCurrentPage > 1);
      oView.byId("btnNextPage").setEnabled(this._iCurrentPage < iTotalPages);

      if (iTotalItems > 0) {
        oView.byId("txtPageInfo").setText(`Mostrando ${iStartIndex + 1} - ${Math.min(iEndIndex, iTotalItems)} de ${iTotalItems}`);
      } else {
        oView.byId("txtPageInfo").setText("No hay registros");
      }
    }
  });
});