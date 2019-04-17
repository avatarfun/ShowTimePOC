import { createRoom, createUser } from './API/APIActions';
const _requiredMedium = { audio: true, video: true };
const _log = msg => {
  console.log(msg);
};
window.cmServer = undefined;
window.serverUrl = 'https://showtimeconf.csez.zohocorpin.com:8443';
window.toMonitoringServer = false;
window.logConnection = false;
window.med_ch = undefined;

window.roomId = undefined;
window.userId;
window.toMonitoringServer = false;
window.userObj = {};
window.keepAlivePeriod = 55000;
window.connection = undefined;
window.med_conf = undefined;
window.confInstance = undefined;

const ST_POC = {
  roomId: '1554873339748',
  userId: undefined,
  start: function(userName = 'Avatar') {
    const _cbk = roomId => {
      window.roomId = ST_POC.roomId = roomId;
      ST_POC.Operations.createNewUser(userName, roomId).then(resp => {
        _log(resp);
        prossResp1(resp);
      });
    };
    if (ST_POC.roomId === undefined) {
      ST_POC.Operations.createNewRoom().then(_cbk);
    } else {
      _cbk(ST_POC.roomId);
    }
  },
  Operations: {
    createNewRoom: function() {
      const roomId = new Date().getTime();
      return createRoom(roomId)
        .then(resp => resp.roomId)
        .catch(err => {
          _log(err);
        });
    },
    createNewUser: function(userName, roomId) {
      const role = 'Member';
      const userAppProperty = { name: userName, role: role };
      const userPermission = {
        publish: true,
        subscribe: true,
        screenshare: true,
        annotate: true
      };
      const payload = _createUserProtoRequest(
        roomId,
        userAppProperty,
        userPermission
      );
      return createUser(roomId, payload);
    }
  }
};
export default ST_POC;

/**
 * @param {*} roomId
 * @param {*} userAppProperty
 * @param {*} userPermissionProperty
 * return CommunicationEvent
 */
const _createUserProtoRequest = function(
  roomId,
  userAppProperty,
  userPermissionProperty
) {
  const css_proto = new CS_PROTO(roomId);
  const eventParams = {
    appProperty: JSON.stringify(userAppProperty),
    permissionProperties: JSON.stringify(userPermissionProperty)
  };
  const messageRoute = css_proto.constructMessageRoute(
    css_proto.MessageEvents.CREATE_USER,
    css_proto.constructDataRelay(null, { roomId: roomId }),
    eventParams
  ); //no i18n
  const reqMsg = css_proto.constructRequest(undefined, undefined, messageRoute);
  const comEvent = css_proto.constructCommunicationEvent(reqMsg);
  return comEvent;
};

const _constructModule = function(
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
    module.info = info;
    module.miniModule = {};
    if (miniModules) {
      miniModules.forEach(miniModule => {
        module.miniModule[miniModule.moduleId] = miniModule;
      });
    }
    return module;
  } catch (e) {
    return null;
  }
};
const _pushMiniModule = function(module, miniModule) {
  try {
    if (miniModule) {
      module.miniModule[miniModule.moduleId] = miniModule;
    }
  } catch (e) {}
};
const prossResp1 = function(response) {
  const { responseString } = response;
  const propertyList = JSON.parse(responseString);
  const {
    user,
    userId,
    appProperty = null,
    permissionProperties
  } = propertyList;
  const userObj = new z_user(userId, appProperty, permissionProperties);
  const userMiniModule = _constructModule(
    'ST',
    user,
    'user',
    new Date().getTime(),
    appProperty,
    null
  ); //no i18n
  _pushMiniModule(module, userMiniModule);
  _getUserMediaPermission().then(resp => {
    // _log(`resp ${resp}`);
    debugger;
    _initCommunicationServer(ST_POC.roomId, userObj);

    // //to monitoring server
    // let dataObjActionSegment = window.constructActionSegment(
    //   'CREATE_USER',
    //   3,
    //   new Date().getTime(),
    //   JSON.stringify({ source: 'FromMSToClient', response: propertyList })
    // ); //no i18n
    // let relationalIds = [];
    // relationalIds.push(parseInt(roomId));
    // let dataObjAction = window.constructAction(
    //   dataObjActionSegment,
    //   relationalIds
    // );
    // let moduleAS = window.constructModuleAS(
    //   roomId,
    //   'CREATE_USER',
    //   dataObjAction
    // ); //no i18n
    // window.pushModuleAS(moduleAS);
  });
};

const _getUserMediaDetails = function() {
  let audioInputDevices = [];
  let videoInputDevices = [];
  let audioExist = false;
  let videoExist = false;
  let gumConstraints = {
    audio: audioExist,
    video: videoExist
  };
  return new Promise((_succ, _fail) => {
    navigator.mediaDevices
      .enumerateDevices()
      .then(devices => {
        devices.forEach(device => {
          if (device.kind == 'audioinput') {
            var _deviceData = { kind: device.kind, deviceId: device.deviceId };
            if (device.label && device.label.length > 0) {
              _deviceData.name = device.label;
            } else {
              _deviceData.name = `Audio Device-${audioInputDevices.length + 1}`;
            }
            audioInputDevices.push(_deviceData);
            audioExist = true;
            gumConstraints.audio = true;
            try {
              var exact = { exact: device.deviceId };
              var _device = { deviceId: exact };
              gumConstraints.audio = _device;
            } catch (something) {
              //                            console.log("something",something);
            }
          }
          if (device.kind == 'videoinput') {
            var _deviceData = { kind: device.kind, deviceId: device.deviceId };
            if (device.label && device.label.length > 0) {
              _deviceData.name = device.label;
            } else {
              _deviceData.name = `Video Device-${videoInputDevices.length + 1}`;
            }
            videoInputDevices.push(_deviceData);
            videoExist = true;
            gumConstraints.video = true;
            try {
              var exact = { exact: device.deviceId };
              var _device = { deviceId: exact };
              gumConstraints.video = _device;
            } catch (something) {
              console.log('something', something);
            }
            // gumConstraints.video.deviceId = exact;
          }
        });
        gumConstraints.video = false;
        _succ(gumConstraints);
      })
      .catch(err => {
        _fail(gumConstraints);
        // console.log(`${err.name}: ${err.message}`);
      });
  });
};
const _getUserMediaPermission = function() {
  return _getUserMediaDetails().then(userMediaConstraints =>
    navigator.mediaDevices.getUserMedia(userMediaConstraints).then(stream => {
      _updateAudioSteamToDOMEle(stream);
    })
  );
};

const _updateAudioSteamToDOMEle = function(stream) {
  // new Promise((_succ, _fail) => {
  const $audio = document.getElementById('zd_audio');
  // const $source = document.getElementById('zd_audioSource');
  if (media_channel.webRTCAdapter.browserDetails.browser === 'chrome') {
    try {
      $audio.srcObject = stream;
    } catch (exception) {}
  } else {
    $audio.src = stream;
  }

  $audio.load();
  $audio.muted = true;
  $audio.play();

  // });

  // if (video) {
  //   // video.src=URL.createObjectURL(stream);
  //   // video.srcObject=stream;
  //   video.autoplay = true;
  //   video.muted = true;
  //   //        if(gumConstraints.audio){
  //   //            // document.getElementById("audio-slider").checked = true;
  //   //        }
  //   //        if(gumConstraints.video){
  //   //            // document.getElementById("video-slider").checked = true;
  //   //        }
  //   if (!video.classList.contains('mirror')) {
  //     video.classList.add('mirror'); //no i18n
  //   }
  // } else {
  //   let videoNew = document.createElement('video');
  //   videoNew.id = 'preview-video';
  //   videoNew.src = URL.createObjectURL(stream);
  //   videoNew.srcObject = stream;
  //   videoNew.autoplay = true;
  //   videoNew.muted = true;
  //   videoNew.classList.add('mirror'); //no i18n
  //   //        if(gumConstraints.audio){
  //   //            // document.getElementById("audio-slider").checked = true;
  //   //        }
  //   //        if(gumConstraints.video){
  //   //            // document.getElementById("video-slider").checked = true;
  //   //        }
  // }
};

const _initCommunicationServer = function(roomId, userObj) {
  cmServer = new com_server(roomId);
  window.userId = ST_POC.userId = userObj.userId;
  cmServer.Events.onInit = function(e) {
    window.IS_CORS_REQ = false;
    cmServer.connect(userObj.userId);
    cmServer.users.push(userObj);
    // let userPermission = _checkIfUserHasPermission(userObj, 'annotate'); //no i18n
    // if (userPermission != 'false') {
    //   whiteboard = true;
    // }
  };

  cmServer.Events.onConnect = function(e) {
    let add = true;
    // if (allowMedia) {
    _initMediaChannel(cmServer);
    // }
  };

  cmServer.Events.onMessage = function(e) {
    _log(`cmServer onMessage : ${e}`);
    // addChat(e);
  };

  cmServer.Events.onJoinedRoom = function(e) {
    _log(`cmServer onJoinedRoom : ${e}`);
    // let add = true;
    // addOrRemoveUser(e.user, add, e.time, e);
    // if (whiteboard) {
    //   if (e.user != userId) {
    //     window.checkAndSendBulkData(userId, e.user);
    //   }
    // }
  };

  cmServer.Events.onLeftRoom = function(e) {
    _log(`cmServer onLeftRoom : ${e}`);
    // let add = false;
    // addOrRemoveUser(e.user, add, e.time, e);
    // if (whiteboard) {
    //   if (e.user != userObj.userId) {
    //     window.removeThisUserData(userObj.userId, e.user);
    //   }
    // }
  };

  cmServer.Events.onNewUser = function(e) {
    cmServer.users.push(e);
    _log(`cmServer onNewUser : ${e}`);
    // let videoFooter = document.getElementById(`footer-${e.userId}`);
    // if (videoFooter) {
    //   videoFooter.innerHTML = textify(e.appProperty.name);
    // }
    // let screenFooter = document.getElementById(`footer-screen-${e.userId}`);
    // if (screenFooter) {
    //   screenFooter.innerHTML = textify(`${e.appProperty.name}'s screen`); //no i18n
    // }
  };

  cmServer.Events.onMediaServerUp = function() {
    _log('cmServer onMediaServerUp ');
    // if (
    //   !document.getElementById('server-down').classList.contains('d-none-imp')
    // ) {
    //   document.getElementById('server-down').classList.add('d-none-imp'); //no i18n
    // }
    // initMediaChannel(cmServer);
  };

  cmServer.Events.onMediaServerDown = function() {
    _log('cmServer onMediaServerDown ');
    if (med_ch) {
      //here, though connection doesnt exist...request to destroy the connection can still be sent.
      let sendReq = false; //media server is down. no point in sending request.
      med_ch.destroyAllHandlesFollowedBySession(sendReq);
    }
    // if (
    //   document.getElementById('server-down').classList.contains('d-none-imp')
    // ) {
    //   document.getElementById('server-down').classList.remove('d-none-imp'); //no i18n
    // }
    setTimeout(() => {
      initMediaChannel(cmServer);
    }, 5000);
  };

  cmServer.init(roomId);

  cmServer.Events.onDisconnect = function(e) {
    _log(`cmServer onDisconnect : ${e}`);
    setTimeout(() => {
      cmServer.connect(userObj.userId);
    }, 3000);
  };

  cmServer.Events.sseinitfailed = function(e) {
    // window.alert("Failed to init SSE. Server down?"); //no i18n
    _log(`cmServer sseinitfailed : ${e}`);
    let messageObj = {};
    messageObj.title = 'Oops!'; //no i18n
    messageObj.content = 'Failed to init SSE. Server down?'; //no i18n
    openModalDialog('error', messageObj); //no i18n
  };
};
// const _checkIfUserHasPermission = function(userObj, permissionProperty) {
//   if (userObj && userObj.permissionProperties) {
//     let permissionPropertyObj = JSON.parse(userObj.permissionProperties);
//     return permissionPropertyObj[permissionProperty];
//   }
//   return false;
// };
const _initMediaChannel = function(cmServer) {
  if (med_ch) {
    //here, though connection doesnt exist...request to destroy the connection can still be sent.
    med_ch.destroyAllHandlesFollowedBySession(true);
  }
  let medCh = new media_channel(cmServer);
  med_ch = medCh;
  medCh.Events.onConnect = function(connection) {
    let connectionModule = _constructModule(
      'ST',
      connection.connectionId,
      'session',
      new Date().getTime(),
      null,
      null
    ); //no i18n
    _pushMiniModule(module, connectionModule);
    initConference(medCh, connection);
    startKeepAliveLoop(medCh);
  };
  medCh.Events.onDisconnect = function() {
    exit();
  };

  medCh.createConnection();
};
