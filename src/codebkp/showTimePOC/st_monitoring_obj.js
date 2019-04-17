(function(win) {
  win.z_module = function(dataObj) {
    this.init(dataObj);
  };

  z_module.prototype = {
    init: function(dataObj) {
      if (dataObj.clientId) {
        this.clientId = dataObj.clientId;
      }
      if (dataObj.moduleId) {
        this.moduleId = dataObj.moduleId;
      }
      if (dataObj.name) {
        this.name = dataObj.name;
      }
      if (dataObj.time) {
        this.time = dataObj.time;
      }
      this.miniModules = [];
      if (dataObj.miniModule) {
        this.miniModules.push(dataObj.miniModule);
      }
      if (dataObj.info) {
        this.info = dataObj.info;
      }
      if (dataObj.keys) {
        this.keys = dataObj.keys;
      }
    },

    // pushMiniModule : function(self,z_module){
    //   self.miniModules.push(z_module);
    // },

    clientId: undefined, //uint64 clientId
    moduleId: undefined, //uint64 moduleId
    name: undefined, //string name
    time: undefined, //uint64 time //at which the first entry was created
    miniModules: [], //map<string,Module> miniModule
    info: undefined, //string info
    keys: undefined //UpdateKey keys
  };

  win.z_module_as = function(dataObj) {
    this.init(dataObj);
  };

  z_module_as.prototype = {
    init: function(dataObj) {
      this.moduleId = dataObj.moduleId;
      this.action = action;
    },

    clientId: undefined, //uint64 clientId
    moduleId: undefined, //uint64 moduleId

    action: undefined, //Action  map<string,Action> action
    // message Action{
    //
    //     repeated ActionSegment actions = 1;
    //
    //     repeated uint64 relationalIds = 2;  // set of Id's where this action is related
    //
    //
    //     enum SegmentProcessTypes{
    //
    //             // segmentType refers whether this mini tranaction should be appended to one another or order by timestamps or by some other techniques
    //
    //             TIMESTAMP = 0;
    //
    //             APPEND = 1;
    //
    //         }
    //
    //     SegmentProcessTypes segmentType = 3; // Every action can have more than one segment (i.e a series of mini transactions to signify completion of an action)
    // }
    // message ActionSegment{
    //
    //     string name = 1;
    //
    //     uint32 state = 2; //1 - Action Initial state,2 - In Progress, 3 - Action Completed
    //
    //     string info = 3;
    //
    //     uint64 time = 4;
    //
    // }

    stat: undefined, //Stat

    // message Stat{
    //
    //     string name = 1;
    //
    //     repeated StatVariables variable = 2;
    //
    //
    // }
    //
    // message StatVariables{
    //
    //     string uniqueIdentifier = 1;
    //
    //     oneof values{
    //
    //         //   map<string,StatVariables> strValue = 2;  TODO:Change from Map
    //
    //         //   map<uint64,StatVariables> numValue = 3;  TODO:Change from Map
    //
    //     }
    //
    // }

    keys: undefined //UpdateKey

    // message UpdateKey{
    //
    //     enum SegmentTypes{
    //
    //         ACTION = 0;
    //
    //         STAT = 1;
    //
    //         MODULE = 2;
    //
    //     }
    //
    //     SegmentTypes type = 1;
    //
    //     map<string,string> keyPair = 2;
    //
    // }
  };

  win.z_action = function(dataObj) {
    this.init(dataObj);
  };

  z_action.prototype = {
    init: function(dataObj) {
      if (dataObj.actions) {
        let actionsegment = dataObj.actions;
        this.actionSegment = actionsegment;
      }
      if (dataObj.relationalId) {
        let { relationalIds } = dataObj;
        this.relationalIds = relationalIds;
      }
    },

    actionSegment: [],
    relationalIds: []
  };

  win.z_actionsegment = function(dataObj) {
    this.init(dataObj);
  };

  z_actionsegment.prototype = {
    init: function(dataObj) {
      if (dataObj.name) {
        this.name = dataObj.name;
        this.state = dataObj.state;
        this.info = dataObj.info;
        this.time = dataObj.time;
      }
    },
    name: undefined, //string
    state: undefined, //int
    info: undefined, //string
    time: undefined //long
  };

  win.constructActionSegment = function(name, state, time, info) {
    try {
      let actionSegment = {};
      if (name) {
        actionSegment.name = name;
        if (state) {
          actionSegment.state = state;
        }
        if (time) {
          actionSegment.time = time;
        }
        if (info) {
          actionSegment.info = JSON.stringify(info);
        }
        let actionSegmentArr = [];
        actionSegmentArr.push(actionSegment);
        return actionSegmentArr;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  win.constructAction = function(actionSegmentArr, relationalIdsArr) {
    try {
      let action = {};
      if (actionSegmentArr && actionSegmentArr.length > 0) {
        action.actions = actionSegmentArr;
        if (relationalIdsArr && relationalIdsArr.length > 0) {
          action.relationalIds = relationalIdsArr;
        }
        return action;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  win.constructModuleAS = function(moduleId, actionKey, action) {
    try {
      let moduleAS = {};
      moduleAS.action = {};
      if (moduleId) {
        moduleAS.moduleId = moduleId;
        if (actionKey && action) {
          moduleAS.action[actionKey] = action;
        }
        return moduleAS;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  win.constructModule = function(
    clientId,
    moduleId,
    name,
    time,
    info,
    miniModules
  ) {
    try {
      let module = {};
      if (clientId == 'ST') {
        clientId = 12345;
      }
      module.clientId = clientId;
      module.moduleId = moduleId;
      module.name = name;
      module.time = time;
      module.info = JSON.stringify(info);
      module.miniModule = {};
      if (miniModules) {
        miniModules.forEach(miniModule => {
          module.miniModule[miniModule.moduleId] = miniModule;
        });
        // module.miniModules = miniModules;
      }
      return module;
    } catch (e) {
      return null;
    }
  };

  win.pushMiniModule = function(module, miniModule) {
    try {
      if (miniModule) {
        module.miniModule[miniModule.moduleId] = miniModule;
      }
    } catch (e) {}
    if (toMonitoringServer) {
      let url = 'https://manoharan-1413.csez.zohocorpin.com:8443/monitoring'; //No i18n
      let req = new ajaxReq(url);
      let moduleData = { module: module };
      req.send('POST', JSON.stringify(moduleData)); //No i18n
    }
    // module.miniModules.push(miniModule);
  };
  win.pushModuleAS = function(moduleAS) {
    if (toMonitoringServer) {
      let url = 'https://manoharan-1413.csez.zohocorpin.com:8443/monitoring'; //No i18n
      let req = new ajaxReq(url);
      let moduleASData = { moduleas: moduleAS };
      req.send('POST', JSON.stringify(moduleASData)); //No i18n
    }
  };
  win.findMiniModule = function(parentModule, miniModuleName) {
    try {
      let _module;
      let itr = parentModule.miniModule;
      for (let i in itr) {
        if (itr[i].name == miniModuleName) {
          return itr[i];
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  };
}(window));
