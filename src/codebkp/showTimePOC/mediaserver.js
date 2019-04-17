(function(win) {
  win.media_channel = function(messagingChannel) {
    this.init(messagingChannel);
  };

  media_channel.prototype = {
    connection: undefined,

    msgCh: undefined,

    media_conference: undefined,

    Events: {
      onConnect: function() {},

      onDisconnect: function() {}
    },

    Errors: {
      onError: function(error) {}
    },

    init: function(messagingChannel) {
      this.bindBeforeUnload();
      this.msgCh = messagingChannel;
    },
    emptyFunction: function() {},

    removeListener: function(target, lisenterid, isDocument) {
      let self = this;
      //            setTimeout(function() {
      if (isDocument) {
        if (document.removeEventListener) {
          document.removeEventListener(lisenterid, () => {});
        } else if (document.detachEvent) {
          document.detachEvent(lisenterid, () => {});
        }
      }
      self.msgCh.documentEventListeners.splice(
        self.msgCh.documentEventListeners.indexOf(lisenterid)
      );
      //            },1000);
    },

    bindBeforeUnload: function() {
      let self = this;
      window.onunload = function(event) {
        self.destroyAllHandlesFollowedBySession(true); //todo:-bind to msging channel
        if (self.connection) {
          self.removeAllListeners();
        }
        self.Events.onDisconnect.apply(self, [self]);
        return null;
      };
    },

    removeAllListeners: function() {
      let self = this;
      let allDocumentListeners = self.connection.msgCh.documentEventListeners;
      allDocumentListeners.forEach(event => {
        if (document.removeEventListener) {
          document.removeEventListener(event, self.emptyFunction());
        } else if (document.detachEvent) {
          document.detachEvent(event, self.emptyFunction());
        }
      });
      // window.alert("destroying");
      // self.connection.msgCh.csConnection.close();
    },

    keepConnectionAlive: function(resolve, reject) {
      if (this.connection) {
        let { msgCh } = this.connection;
        let self = this;
        let allHandleIds = [];
        let mediaParams = {
          sessionId: this.connection.connectionId //no i18n
        }; //no i18n
        let onlyString = true;
        let randomNumber = 'keep_connection_alive_ack'; //no i18n
        // document.addEventListener("keep_connection_alive_ack", function(event){
        //     self.removeListener("document","keep_connection_alive_ack",true); //no i18n
        resolve();
        //     var ack = JSON.parse(event.detail);
        // })
        resolve();
        let req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.KEEP_CONNECTION_ALIVE,
          'keep_connection_alive',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
      }
    },

    destroyAllHandlesFollowedBySession: function(sendReq) {
      if (this.connection) {
        let { msgCh } = this.connection;
        let allHandleIds = [];
        for (var k in this.media_conference.subscriberHandles) {
          let thisSubscriberHandle = this.media_conference.subscriberHandles[k];
          this.media_conference.Events.onStreamDestroyed.apply(
            thisSubscriberHandle,
            [thisSubscriberHandle]
          ); //this event is applied before callback because,
          // no callback will be sent after the connection is destroyed
          allHandleIds.push(Number(thisSubscriberHandle.pluginId));
        }
        for (var k in this.media_conference.pubHandles) {
          let thisHandle = this.media_conference.pubHandles[k];
          thisHandle.closeMyPeerConnection(thisHandle);
          this.media_conference.Events.onStreamDestroyed.apply(thisHandle, [
            thisHandle
          ]);
          allHandleIds.push(Number(thisHandle.pluginId));
        }
        let mediaParams = {
          sessionId: this.connection.connectionId, //no i18n
          eventParams: { allHandleIds: allHandleIds.toString() } //no i18n
        }; //no i18n
        let randomNumber = this.connection.msgCh.generateRandomNumber(
          'destroy_all_handles_followed_by_session'
        ); //no i18n
        this.removeAllListeners();
        let info = {
          source: 'FromClientToMS',
          mediaParams: mediaParams,
          sendReq: sendReq
        }; //no i18n
        // info.response = response;
        let self = this;
        let actionSegment = self.connection.msgCh.createActionSegment(
          'DESTROY_CONNECTION',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        let relationalIds = [];
        let transactionId;
        relationalIds.push(
          parseInt(roomId),
          parseInt(userId),
          this.connection.connectionId
        );
        let action = self.connection.msgCh.createAction(
          actionSegment,
          relationalIds
        );
        self.connection.msgCh.createModuleASAndSend(
          roomId,
          randomNumber,
          action
        ); //no i18n

        let req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.DESTROY_CONNECTION,
          'destroy_all_handles_followed_by_session',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber,
          true
        ); //no i18n
        req.Events.onAck = function(ack) {
          media_channel.Debug.log(`Trickle Ice completed Ack ${ack}`);
        };

        function responseFunction(e) {
          try {
            document.removeEventListener(transactionId, responseFunction); //no i18n
          } catch (ex) {
            document.removeEventListener(transactionId, responseFunction); //no i18n
            self.Errors.onError.apply(
              self,
              self.msgCh.cs_proto.Errors.DESTROY_CONNECTION
            );
          }
        }

        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          let { type } = ack;
          transactionId = ack.transactionId;
          document.removeEventListener(
            `${'destroy_all_handles_followed_by_session' +
              '_ack_'}${randomNumber.toString()}`,
            ackFunction
          ); //no i18n
          document.addEventListener(transactionId, responseFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `${'destroy_all_handles_followed_by_session' +
            '_ack_'}${randomNumber.toString()}`,
          ackFunction
        );
        req.Events.onError = function(error) {
          media_channel.Debug.log('destroy session error', error);
        };
      }
    },
    createConnection: function() {
      let randomNumber = this.msgCh.generateRandomNumber('create_session'); //no i18n
      let info = { source: 'FromClientToMS' }; //no i18n
      let actionSegment = this.msgCh.createActionSegment(
        'INIT_CONNECTION',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(parseInt(roomId), parseInt(userId));
      let action = this.msgCh.createAction(actionSegment, relationalIds);
      this.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n
      let req = this.msgCh.sendReq(
        this.msgCh.cs_proto.MediaEvents.INIT_CONNECTION,
        'create_session',
        this.msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        this.msgCh.cs_proto.EventPipeLines.MEDIA,
        undefined,
        randomNumber
      ); //no i18n
      let self = this;
      let transactionId;
      function responseFunction(e) {
        try {
          let response = JSON.parse(e.detail);
          document.removeEventListener(transactionId, responseFunction); //no i18n
          let info = { source: 'FromMSToClient' }; //no i18n
          info.response = response;
          let actionSegment = self.msgCh.createActionSegment(
            'INIT_CONNECTION',
            3,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(parseInt(roomId), parseInt(userId));
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          self.msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n

          if (response.id) {
            let _connection = { connectionId: response.id, msgCh: self.msgCh };
            self.connection = _connection;
            self.Events.onConnect.apply(self, [_connection]);
            cmServer.mediaServerStatus = 'up'; //no i18n
            cmServer.Events.onMediaServerUp.apply(cmServer, []);
          } else {
            self.Errors.onError.apply(
              self,
              self.msgCh.cs_proto.Errors.CREATE_CONNECTION
            );
          }
        } catch (ex) {
          document.removeEventListener(transactionId, responseFunction); //no i18n
          self.Errors.onError.apply(
            self,
            self.msgCh.cs_proto.Errors.CREATE_CONNECTION
          );
        }
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        let { type } = ack;
        transactionId = ack.transactionId;
        document.removeEventListener(
          `${'create_session' + '_ack_'}${randomNumber.toString()}`,
          ackFunction
        ); //no i18n
        document.addEventListener(transactionId, responseFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `${'create_session' + '_ack_'}${randomNumber.toString()}`,
        ackFunction
      );
      req.Events.onError = function(error) {
        self.Errors.onError.apply(
          self,
          self.msgCh.cs_proto.Errors.CREATE_CONNECTION
        );
      };
    },
    initConference: function(_connection) {
      //RoomKey Needed ?
      let media_conf;
      if (_connection) {
        media_conf = new media_conference(_connection);
      } else {
        media_conf = new media_conference(this.connection);
      }
      this.media_conference = media_conf;
      return media_conf;
    }
  };

  win.media_stream = function() {};

  media_stream.prototype = {};

  win.media_conference = function(connection) {
    this.init(connection);
  };

  media_conference.prototype = {
    plugin: 'VIDEOROOM', //no i18n

    pluginId: undefined,

    connectionId: undefined,

    roomId: undefined,

    msgCh: undefined,

    confStreams: {},

    pubHandles: {},

    // fullScreenInProgress:false,

    subscriberHandles: {},

    screenSharedWithCanvas: [],

    confInstance: undefined,

    id: undefined,

    //bug fix -- firefox subscriber cannot join since the join message comes first before stream comes

    currentState: 'default', //no i18n

    delayedSubscribersArray: [],

    Events: {
      onInit: function() {},

      onJoin: function() {},

      onStream: function() {},

      // onNewMember:function(){
      //
      // },

      onStreamDestroyed: function() {
        // console.log("userLeft");
      },

      onCreateVideoElement: function() {}
    },

    Errors: {
      onError: function() {}
    },

    removeListener: function(target, lisenterid, isDocument) {
      let self = this;
      //            setTimeout(function() {
      if (isDocument) {
        if (document.removeEventListener) {
          document.removeEventListener(lisenterid, () => {});
        } else if (document.detachEvent) {
          document.detachEvent(lisenterid, () => {});
        }
      }
      self.msgCh.documentEventListeners.splice(
        self.msgCh.documentEventListeners.indexOf(lisenterid)
      );
      //            },1000);
    },

    addStreamToConf: function(stream) {
      this.confStreams[stream.id] = stream;
    },

    bindRoomToMediaServer: function(_pluginId) {
      let self = this;
      this.msgCh.csConnection.addEventListener(
        _pluginId,
        e => {
          //Process Publisher Left/Join Message
          media_channel.Debug.logConnection(
            `received at plugin ${_pluginId} data->${e.data}`
          ); //no i18n
          self.handleMessage(e.data);
        },
        false
      );
    },

    handleMessage: function(data) {
      //handle message if event type is NEW_PUBLISHER/PUBLISHER_LEFT
      try {
        let responseEvent = JSON.parse(data);
        if (responseEvent.status == 'RELAY') {
          //since the events would only be relayed
          if (responseEvent.mediaEvent.taskEvent.event == 'NEW_PUBLISHER') {
            let response = JSON.parse(responseEvent.responseString);
            if (!this.pubHandles[response.id]) {
              //notice difference in response. stream.id Vs stream.streamId
              // this.Events.onNewMember.apply(this,[stream.display])
              this.Events.onStream.apply(this, [response]);
            }
          } else if (
            responseEvent.mediaEvent.taskEvent.event == 'PUBLISHER_LEFT'
          ) {
            //no i18n
            //these messages are now sent to streamId bound by its own subscriber
            let stream = JSON.parse(responseEvent.responseString);
            let self = this;
            if (!this.pubHandles[stream.streamId]) {
              media_channel.allHandles.find(obj => {
                if (obj.streamId == stream.streamId) {
                  // obj.closeMyPeerConnection();
                  obj.detachHandle();
                }
              });
            } else {
              let publisher = this.pubHandles[stream.streamId];
              if (publisher.source == 2 || publisher.source == 3) {
                publisher.webrtcCORE.screenShareInProgress == false;
                self.Events.onStreamDestroyed.apply(self, [publisher]);
              }
            }
          }
        }
      } catch (e) {
        //TODO: throw or at least log why handling of message fails
      }
    },

    init: function(connection) {
      this.connectionId = connection.connectionId;
      this.msgCh = connection.msgCh;
      let mediaParams = {
        sessionId: this.connectionId,
        eventParams: { pluginType: this.plugin }
      }; //no i18n
      let randomNumber = this.msgCh.generateRandomNumber(
        'init_videoroom_plugin'
      ); //no i18n

      let info = { source: 'FromClientToMS' }; //no i18n
      info.mediaParams = mediaParams;
      let actionSegment = this.msgCh.createActionSegment(
        'INIT_PLUGIN',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(parseInt(roomId), parseInt(userId), this.connectionId);
      let action = this.msgCh.createAction(actionSegment, relationalIds);
      this.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

      let req = this.msgCh.sendReq(
        this.msgCh.cs_proto.MediaEvents.INIT_PLUGIN,
        'init_videoroom_plugin',
        this.msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        this.msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n
      let self = this;
      let transactionId;
      function respFunc(e) {
        document.removeEventListener(transactionId, respFunc);
        try {
          let response = JSON.parse(e.detail);

          let info = { source: 'FromMSToClient', response: response }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'INIT_PLUGIN',
            3,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(
            parseInt(roomId),
            parseInt(userId),
            self.connectionId
          );
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          self.msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n
          if (response.id) {
            self.pluginId = response.id;
            self.roomId = self.msgCh.roomId;
            self.bindRoomToMediaServer(self.pluginId);
            self.Events.onInit.apply(self, [response]);
            self.currentState = 'INITED'; //To maintain state //no i18n
          } else {
            self.Errors.onError.apply(
              self,
              self.msgCh.cs_proto.Errors.INIT_PLUGIN
            );
          }
        } catch (ex) {
          self.Errors.onError.apply(
            self,
            self.msgCh.cs_proto.Errors.INIT_PLUGIN
          );
        }
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        transactionId = ack.transactionId;
        self.msgCh.documentEventListeners.push(ack.transactionId);
        document.removeEventListener(
          `init_videoroom_plugin_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunc);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `init_videoroom_plugin_ack_${randomNumber.toString()}`,
        ackFunction
      );

      req.Events.onError = function(error) {
        self.Errors.onError.apply(self, this.msgCh.cs_proto.Errors.INIT_PLUGIN);
      };
    },

    join: function() {
      if (this.pluginId) {
        let mediaParams = {
          sessionId: this.connectionId,
          handleId: this.pluginId,
          eventParams: { roomId: this.roomId }
        }; //no i18n
        let randomNumber = this.msgCh.generateRandomNumber(
          'map_room_to_plugin/join_a_room_in_plugin'
        ); //no i18n

        let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        let actionSegment = this.msgCh.createActionSegment(
          'MAP_ROOM_TO_PLUGIN',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        let relationalIds = [];
        relationalIds.push(
          parseInt(roomId),
          parseInt(userId),
          this.connectionId,
          this.pluginId
        );
        let action = this.msgCh.createAction(actionSegment, relationalIds);
        this.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        let req = this.msgCh.sendReq(
          this.msgCh.cs_proto.MediaEvents.MAP_ROOM_TO_PLUGIN,
          'map_room_to_plugin/join_a_room_in_plugin',
          this.msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          this.msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
        var self = this;
        let transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);
            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'MAP_ROOM_TO_PLUGIN',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              parseInt(roomId),
              parseInt(userId),
              self.connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n
            if (response.id) {
              //Get Id from Response,Id is publisher uniqueId so this id will be used to identify publisher handles later
              self.id = response.id;
              let confInstance = {
                connection: {
                  connectionId: self.connectionId,
                  msgCh: self.msgCh
                },
                conf: self
              };
              confInstance.id = response.id;
              self.confInstance = confInstance;
              self.Events.onJoin.apply(self, [confInstance]);
              self.currentState = 'JOINED'; //to maintain state //no i18n
            } else {
              self.Errors.onError.apply(self, [
                self.msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED
              ]);
            }
            //self.clearQueuedSubscribers(); //to clear the subscribers in queue
            self.clearQueuedSubscribers(
              self.delayedSubscribersArray,
              obj => {
                self.subscribe(obj);
              },
              150
            );
          } catch (error) {
            self.Errors.onError.apply(self, [
              self.msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED
            ]);
          }
        }

        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          self.msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `map_room_to_plugin/join_a_room_in_plugin_ack_${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `map_room_to_plugin/join_a_room_in_plugin_ack_${randomNumber.toString()}`,
          ackFunction
        );

        req.Events.onError = function(error) {
          self.Errors.onError.apply(self, [
            self.msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED
          ]);
        };
      } else {
        this.Errors.onError.apply(self, [
          this.msgCh.cs_proto.Errors.NEED_TO_INIT_PLUGIN
        ]);
      }
    },
    /*
            Options - [stream (or) audio/video (or) screen ]
            //TODO: video=different resolution modes
        */
    initPublisher: function(options, source) {
      if (this.confInstance) {
        let { confInstance } = this;
        // var new_publisher = Object.create(z_publisher.prototype,{self.confInstance,options,source});
        let publisher = new z_publisher(this.confInstance, options, source);
        // console.log("publisher",Object.values(publisher))
        media_channel.allHandles.push(publisher);
        if (publisher.source == 2 || publisher.source == 3) {
          media_channel.screenShareHandles.push(publisher);
        }
        return publisher;
      }
      //        else{
      //            //TODO:Throw ' Init and Join conference First'  Error
      //        }
    },

    // checkIfScreenShareExtensionHasBeenInstalled:function(resolve,reject){
    //     var isFireFox =  navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    //     var userAgent = navigator.userAgent.toLowerCase();
    //     var isChrome = userAgent.indexOf('chrome') > -1 && userAgent.indexOf('opr/') == -1 && navigator.vendor.toLowerCase().search('google') != -1;  //no i18n
    //
    //     if(isFireFox){
    //         var minimumSupport = 52;
    //         var version = navigator.userAgent.match(/Firefox\/(\d+)/)[1];
    //         if(version > minimumSupport){
    //
    //         }else{
    //             reject({error:"ScreenSharing is not supported. Please update your browser to the latest version"}); //no i18n
    //         }
    //     }else if(isChrome){
    //         var extensionId='ckhjdpimaajfecjkjoncibfeaacejkee'; //no i18n
    //         var type={
    //             type:'isInstalled' //no i18n
    //         }
    //         var sender = null;
    //         chrome.runtime.sendMessage(extensionId,type,sender,function(response){
    //             if(response){
    //                 var source= {
    //                     screen: true,
    //                     application: false,
    //                     window: true,
    //                     browser: false
    //                 }
    //                 chrome.runtime.sendMessage(extensionId, {type: 'getSourceId', source: source}, sender, function (data) { //no i18n
    //                     if (data.error === 'permissionDenied') {
    //                         reject({error:"permission Denied"}); //no i18n
    //                     } else if (data.error) {
    //                         reject({error:"something went wrong"}); //no i18n
    //                     } else {
    //                         resolve(data);
    //                     }
    //                 });
    //             }else{
    //                 reject({error:"need To Install Extension"}); //no i18n
    //             }
    //         })
    //     }else{
    //         reject({error:"ScreenSharing is not supported"}); //no i18n
    //     }
    // },

    subscribe: function(stream) {
      let self = this;
      try {
        if (self.currentState == 'JOINED') {
          if (this.confInstance) {
            if (stream && stream.id) {
              let source = 1;
              if (stream.publisherSource == 'screen') {
                source = 2;
              }
              // if(stream.display.indexOf("screenshare")!=-1){
              //     source =2;
              // }
              let newSubscriber = new z_subscriber(
                this.confInstance,
                stream,
                source
              );
              media_channel.allHandles.push(newSubscriber);
              return newSubscriber;
            }
            let dummy;
            // TODO: throw Invalid Stream Error
            //console.log("Invalid Stream");
          }
        } else {
          //TODO: Throw Init conference first Error
          self.delayedSubscribersArray.push(stream);
        }
      } catch (e) {
        //console.log("Error --> ",e);
      }
    },

    /*clearQueuedSubscribers:function(){
            var self=this;
            var i;
            for (i = 0; i < self.delayedSubscribersArray.length; i++) {
                setDelay(self.delayedSubscribersArray[i]);
            }

            function setDelay(stream){
                setTimeout(function(){
                    self.subscribe(stream);
                }, 150);
            }
        }*/

    clearQueuedSubscribers(array, delegate, delay) {
      if (array.length != 0) {
        let i = 0;

        // seed first call and store interval (to clear later)
        var interval = setInterval(() => {
          // each loop, call passed in function
          delegate(array[0]);
          array.splice(0, 1);

          // increment, and if we're past array, clear interval
          if (!array.length) {
            clearInterval(interval);
          }
        }, delay);

        return interval;
      }
    }
  };

  win.avOptions = function() {
    this.init();
  };

  avOptions.prototype = {
    audio: {
      reason: null,
      hasAudio: null
    },
    video: {
      reason: null,
      hasVideo: null
    },
    init: function() {
      this.audio = {
        reason: null,
        hasAudio: null
      };
      this.video = {
        reason: null,
        hasVideo: null
      };
    }
  };

  win.z_webrtc = function() {
    this.init();
  };

  z_webrtc.prototype = {
    options: null,
    myStream: null,
    mySdp: null,
    mediaConstraints: null,
    streamExternal: false,
    pc: null,
    trickle: false, // trickle default FALSE, but can change this property by checking the browser
    iceDone: false,
    webrtcUP: false,
    volume: {
      value: null,
      timer: null
    },
    bitrate: {
      value: 2048000,
      bsnow: null,
      bsbefore: null,
      tsnow: null,
      tsbefore: null,
      timer: null
    },
    screenShareInProgress: false,
    isVideoDisabledByPublisher: false,
    isAudioDisabledByPublisher: false,
    remoteStream: null,
    remoteSdp: null,
    candidates: [],

    //Parameters added for simulcast /r
    screenshareFrameRate: 3,
    nacksArray: [],
    timeStamp: 0,
    lastNackReceivedTime: 0,
    substream: null,
    temporal: null,

    init: function() {
      this.volume = {
        value: null,
        timer: null
      };
      this.bitrate = {
        value: 2048000,
        bsnow: null,
        bsbefore: null,
        tsnow: null,
        tsbefore: null,
        timer: null
      };
    }
  };

  win.z_publisher = function(confInstance, options, sourceObj) {
    this.init(confInstance, options, sourceObj);
  };

  z_publisher.prototype = {
    confInstance: undefined,

    connection: undefined,

    userId: undefined,

    id: undefined,

    pluginId: undefined,

    handleType: 1,

    avOptions: undefined,

    msgCh: undefined,

    isStreamDestroyed: false,

    source: 1, //by default the source is 1=>A/V. the source can also be 2=>"screen". 3=>canvas //no i18n

    iceState: undefined,

    publishTimer: undefined,

    //Parameter added for simulcast /r
    //bitrateChangeLoop:{},
    increaseBitrateLoop: {},
    decreaseBitrateLoop: {},
    increaseCounter: 0,
    decreaseCounter: 0,
    increaseInterval: 137000,
    startingDecreaseInterval: 30000,
    firedOnce: false,
    statsResult: null,
    tempGoogAvailableSendBandwidth: null,

    init: function(confInstance, options, sourceObj) {
      if (sourceObj) {
        this.source = sourceObj.source;
      }
      // if(sourceObj && sourceObj.videoId){
      //     this.sourceVideo = sourceObj.videoId;
      // }
      this.confInstance = confInstance.conf;
      this.userId = userId;
      this.connection = confInstance.connection;
      this.msgCh = confInstance.connection.msgCh;
      this.webrtcCORE = new z_webrtc();
      this.avOptions = new avOptions();
      if (options.audio == true) {
        this.avOptions.audio.hasAudio = true;
        this.avOptions.audio.reason = 0;
      } else {
        this.avOptions.audio.hasAudio = false;
      }
      if (options.video == true) {
        this.avOptions.video.hasVideo = true;
        this.avOptions.video.reason = 0;
      } else {
        this.avOptions.video.hasVideo = false;
      }
      //     {
      //     options:null,
      //     myStream:null,
      //     mySdp:null,
      //     mediaConstraints:null,
      //     streamExternal:false,
      //     pc:null,
      //     trickle:false, // trickle default FALSE, but can change this property by checking the browser
      //     iceDone:false,
      //     webrtcUP:false,
      //     volume:{
      //         value:null,
      //         timer:null
      //     },
      //     bitrate:{
      //         value:null,
      //         bsnow:null,
      //         bsbefore:null,
      //         tsnow:null,
      //         tsbefore:null,
      //         timer:null
      //     },
      //     screenShareInProgress:false
      // };
      this.webrtcCORE.options = options;
      this.webrtcCORE.bitrate.value = options.bitrate;
      //console.log("Initializing Bitrate --> ", this.webrtcCORE.bitrate.value);
      this.bindWebrtcEvents();
      this.checkAndSetTrickleSupport();
      let selectedDevices = {};
      if (sourceObj && sourceObj.video && sourceObj.audio) {
        selectedDevices.video = sourceObj.video;
        selectedDevices.audio = sourceObj.audio;
      }
      this.getMediaStream(options, selectedDevices);

      //For simulcast, we are finding out the time at which publisher is joined and check for no slow links loop is triggered /r
      this.webrtcCORE.timeStamp = new Date().getTime();
      media_channel.Debug.log(
        `New Publisher joined at ${new Date(
          this.webrtcCORE.timeStamp
        ).toLocaleTimeString('en-US')}`
      );
    },

    checkAndSetTrickleSupport: function() {
      this.webrtcCORE.trickle = media_channel.trickleSupported;
    },

    webrtcEvents: {
      iceStateChanged: function(iceState) {},

      sdpOffer: function(error, jsep) {
        // Both creation and Error for Offer would be called on this method and Mostly would be user for Publisher
      },

      sdpAnswer: function(error, jsep) {
        // Both creation and Error for Answer would be called on this method and Mostly would be user for Subscriber
      },

      remoteJsepProcessed: function(error, responseObj) {},

      sdpWithIce: function(sdp) {},

      trickleIceCandidate: function(candidate) {}
    },
    Events: {
      onInit: function(publisher) {},

      onStreamCreated: function(stream) {},

      onStreamDestroyed: function() {},

      onPublish: function() {},

      onUnpublish: function() {},

      onAudioVideoPropertyChange: function(options) {},

      onPause: function() {},

      onStart: function() {},

      onFailure: function() {},

      onTalking: function() {},

      onStoppedTalking: function() {},

      onSlowLink: function() {}, //writing slowlink code in html

      onWebrtcup: function() {}, //writing increase bandwidth code in html

      initGetStats: function() {}, //writing getstats code in html

      onSignalingStateChange: function() {},

      onVideoPlayBackSuccess: function() {},

      onVideoPlayBackFailure: function() {},

      onStreamFromClient: function() {}
    },

    Errors: {
      onError: function(err) {
        // window.alert("error pudichachu");
      }
    },

    getThisMediaStream: function(handle, mediaConstraints, resolve, reject) {
      let gumConstraints = {
        audio: false,
        video: false
      };
      // if(mediaConstraints.isAudioChanged){
      if (mediaConstraints.audio == 'none') {
        gumConstraints.audio = false;
      } else {
        var exact = { exact: mediaConstraints.audio };
        var _device = { deviceId: exact };
        gumConstraints.audio = _device;
      }
      // }
      // if(mediaConstraints.isVideoChanged){
      if (mediaConstraints.video == 'none') {
        gumConstraints.video = false;
      } else {
        var exact = { exact: mediaConstraints.video };
        var _device = { deviceId: exact };
        gumConstraints.video = _device;
      }
      // }
      navigator.mediaDevices.getUserMedia(gumConstraints).then(
        stream => {
          // var stream = handle.webrtcCORE.myStream;
          handle.webrtcCORE.myStream = stream;
          // handle.streamId = stream.id;
          handle.Events.onStreamCreated.apply(handle, [
            { stream: stream, plugin: handle }
          ]);
          if (resolve) {
            resolve(stream);
          }
        },
        error => {
          handle.Errors.onError.apply(handle, [error]);
          // window.alert("erroringettingmedia" + "   " + error.toString()); //no i18n
          if (reject) {
            reject();
          }

          //TODO: throw Error [callbacks.error({code: error.code, name: error.name, message: error.message});]
        }
      );
    },

    restartNegotiation: function(handle, mediaConstraints, isIceFail) {
      let config = handle.webrtcCORE;
      if (!isIceFail) {
        let selectedAudio = mediaConstraints.audioSelectedValue;
        let selectedVideo = mediaConstraints.videoSelectedValue;
        let { browser } = media_channel.webRTCAdapter.browserDetails;
        let { version } = media_channel.webRTCAdapter.browserDetails;
        // mediaConstraints.offerToReceiveAudio = false;
        // mediaConstraints.offerToReceiveVideo = false;
        // mediaConstraints.iceRestart = true;
        if (mediaConstraints.removeVideo && mediaConstraints.isVideoChanged) {
          if (!(browser == 'firefox' && version >= 59)) {
            for (var index in config.pc.getSenders()) {
              var s = config.pc.getSenders()[index];
              if (s && s.track && s.track.kind === 'video') {
                config.pc.removeTrack(s);
                // console.log("replace track as null");
                // s.replaceTrack(null);
              }
            }
          } else {
            var videoTransceiver = null;
            var transceivers = config.pc.getTransceivers();
            if (transceivers && transceivers.length > 0) {
              for (var i in transceivers) {
                var t = transceivers[i];
                if (
                  (t.sender &&
                    t.sender.track &&
                    t.sender.track.kind === 'video') ||
                  (t.receiver &&
                    t.receiver.track &&
                    t.receiver.track.kind === 'video')
                ) {
                  //no i18n
                  videoTransceiver = t;
                  break;
                }
              }
            }
            if (videoTransceiver && videoTransceiver.sender) {
              videoTransceiver.sender.replaceTrack(null);
            }
          }
          if (
            config.myStream.getVideoTracks() &&
            config.myStream.getVideoTracks().length > 0
          ) {
            config.myStream.getVideoTracks()[0].stop();
          }
        }
        if (mediaConstraints.removeAudio && mediaConstraints.isAudioChanged) {
          if (!(browser == 'firefox' && version >= 59)) {
            for (var index in config.pc.getSenders()) {
              var s = config.pc.getSenders()[index];
              if (s && s.track && s.track.kind === 'audio') {
                config.pc.removeTrack(s);
                // s.replaceTrack(null);
              }
            }
          } else {
            var videoTransceiver = null;
            var transceivers = config.pc.getTransceivers();
            if (transceivers && transceivers.length > 0) {
              for (var i in transceivers) {
                var t = transceivers[i];
                if (
                  (t.sender &&
                    t.sender.track &&
                    t.sender.track.kind === 'audio') ||
                  (t.receiver &&
                    t.receiver.track &&
                    t.receiver.track.kind === 'audio')
                ) {
                  //no i18n
                  videoTransceiver = t;
                  break;
                }
              }
            }
            if (videoTransceiver && videoTransceiver.sender) {
              videoTransceiver.sender.replaceTrack(null);
            }
          }
          if (
            config.myStream.getAudioTracks() &&
            config.myStream.getAudioTracks().length > 0
          ) {
            config.myStream.getAudioTracks()[0].stop();
          }
        }
        if (
          mediaConstraints.replaceVideo ||
          mediaConstraints.addVideo ||
          mediaConstraints.replaceAudio ||
          mediaConstraints.addAudio
        ) {
          let promise = new Promise((resolve, reject) => {
            handle.getThisMediaStream(
              handle,
              mediaConstraints,
              resolve,
              reject
            );
          });
          promise.then(
            stream => {
              media_channel.createNewOffer(handle, mediaConstraints, stream);
            },
            error => {
              // console.log("error",error);
            }
          );
        } else {
          media_channel.createNewOffer(handle, mediaConstraints);
        }
      } else {
        config.pc.createOffer(mediaConstraints).then(
          offer => {
            config.mySdp = offer.sdp;
            config.pc.setLocalDescription(offer);
            config.mediaConstraints = mediaConstraints;
            if (!config.iceDone && !config.trickle) {
              // Don't do anything until we have all candidates
              return;
            }
            // JSON.stringify doesn't work on some WebRTC objects anymore
            // See https://code.google.com/p/chromium/issues/detail?id=467366
            let jsep = {
              type: offer.type, //no i18n
              sdp: offer.sdp //no i18n
            };
            handle.webrtcEvents.sdpOffer.apply(handle, [undefined, jsep]);
          },
          error => {
            handle.webrtcEvents.sdpOffer.apply(handle, [error]);
          }
        );
      }
    },

    removeListener: function(target, lisenterid, isDocument) {
      let self = this;
      //            setTimeout(function() {
      if (isDocument) {
        if (document.removeEventListener) {
          document.removeEventListener(lisenterid, () => {});
        } else if (document.detachEvent) {
          document.detachEvent(lisenterid, () => {});
        }
      }
      self.connection.msgCh.documentEventListeners.splice(
        self.connection.msgCh.documentEventListeners.indexOf(lisenterid)
      );
      //            },1000);
    },

    closeMyPeerConnection: function(handle) {
      if (handle) {
        let config = handle.webrtcCORE;
        if (config) {
          try {
            if (config.volume) {
              if (config.volume.local && config.volume.local.timer) {
                clearInterval(config.volume.local.timer);
              }
              if (config.volume.remote && config.volume.remote.timer) {
                clearInterval(config.volume.remote.timer);
              }
            }
            config.volume = {};
            if (config.bitrate.timer) {
              clearInterval(config.bitrate.timer);
            }
            config.bitrate.timer = null;
            config.bitrate.bsnow = null;
            config.bitrate.bsbefore = null;
            config.bitrate.tsnow = null;
            config.bitrate.tsbefore = null;
            config.bitrate.value = null;
            try {
              // Try a MediaStreamTrack.stop() for each track
              if (config.myStream !== null && config.myStream !== undefined) {
                let tracks = config.myStream.getTracks();
                for (let i in tracks) {
                  let mst = tracks[i];
                  if (mst !== null && mst !== undefined) {
                    mst.stop();
                  }
                }
              }
            } catch (e) {
              // Do nothing if this fails
            }
            config.streamExternal = false;
            config.myStream = null;
            // Close PeerConnection
            if (config.pc) {
              try {
                config.pc.close();
              } catch (e) {
                // Do nothing
              }
            }
            config.pc = null;
            config.candidates = null;
            config.mySdp = null;
            config.remoteSdp = null;
            config.iceDone = false;
            config.dataChannel = null;
            config.dtmfSender = null;

            //For Simulcast ,If the publisher leaves the room, 'setTimeout property for increaseBitrateLoop and decreaseBitrateLoop' has to be cleared out - simulcast /r
            if (this.increaseBitrateLoop) {
              media_channel.Debug.log('Publisher connection closed');
              clearTimeout(this.increaseBitrateLoop);
            }
            if (this.decreaseBitrateLoop) {
              media_channel.Debug.log('Publisher connection closed');
              clearTimeout(this.decreaseBitrateLoop);
            }
          } catch (Excep) {
            //todo
          }
        }
      }
    },

    checkIfScreenShareExtensionHasBeenInstalledAndFetchStream: function(
      resolve,
      reject,
      frameRate
    ) {
      let isFireFox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      let userAgent = navigator.userAgent.toLowerCase();
      let isChrome =
        userAgent.indexOf('chrome') > -1 &&
        userAgent.indexOf('opr/') == -1 &&
        navigator.vendor.toLowerCase().search('google') != -1; //no i18n

      if (isFireFox) {
        let minimumSupport = 52; //todo:-this number
        var version = navigator.userAgent.match(/Firefox\/(\d+)/)[1];
        if (version > minimumSupport) {
          var video = {
            mediaSource: 'application' //no i18n
          };
          resolve({ video: video });
        } else {
          reject({
            error:
              'ScreenSharing is not supported. Please update your browser to the latest version'
          }); //no i18n
        }
      } else if (isChrome) {
        let _extensionId = extensionId; //todo:- this id- have it passed by service //no i18n
        var { version } = media_channel.webRTCAdapter.browserDetails;
        if (version >= 72) {
          var video = {
            maxWidth: window.screen.availWidth,
            maxHeight: window.screen.availHeight,
            mandatory: {
              minFrameRate: frameRate, //need to check why this line is added /r
              maxFrameRate: frameRate //need to check why this line is added /r
            }
          };
          resolve({ video: video });
        } else {
          let type = {
            type: 'isInstalled' //no i18n
          };
          let sender = null;
          chrome.runtime.sendMessage(_extensionId, type, sender, response => {
            if (response) {
              let source = _screenshareSourceChrome;
              chrome.runtime.sendMessage(
                _extensionId,
                { type: 'getSourceId', source: source },
                sender,
                data => {
                  //no i18n
                  if (data.error === 'permissionDenied') {
                    reject({ error: 'permission Denied' }); //no i18n
                  } else if (data.error) {
                    reject({ error: 'something went wrong' }); //no i18n
                  } else {
                    let video = {
                      maxWidth: window.screen.availWidth,
                      maxHeight: window.screen.availHeight,
                      mandatory: {
                        minFrameRate: frameRate, //need to check why this line is added /r
                        maxFrameRate: frameRate, //need to check why this line is added /r

                        chromeMediaSource: 'desktop', //no i18n
                        chromeMediaSourceId: data.sourceId
                      }
                    };
                    resolve({ video: video });
                  }
                }
              );
            } else {
              reject({
                error: 'You need to install our screenshare extension.',
                resolveBy: 'reDirectToExtensionPage()',
                resolveMsg: 'Click Here.'
              }); //no i18n
            }
          });
        }
      } else {
        reject({ error: 'ScreenSharing is not supported' }); //no i18n
      }
    },
    detachHandle: function() {
      let allHandleIds = [];
      allHandleIds.push(this.pluginId);
      let { msgCh } = this.connection;
      var self = this;
      let mediaParams = {
        sessionId: this.connection.connectionId,
        eventParams: { allHandleIds: allHandleIds.toString() }
      }; //no i18n
      let randomNumber = msgCh.generateRandomNumber('detach_plugin'); //no i18n

      let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
      let actionSegment = self.msgCh.createActionSegment(
        'DETACH_PLUGIN',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(
        parseInt(roomId),
        parseInt(userId),
        this.connection.connectionId
      );
      let action = self.msgCh.createAction(actionSegment, relationalIds);
      self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

      let req = msgCh.sendReq(
        msgCh.cs_proto.MediaEvents.DETACH_PLUGIN,
        'detach_plugin',
        msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n
      var self = this;
      let transactionId;
      function respFunction(e) {
        document.removeEventListener(transactionId, respFunction);
        try {
          let response = JSON.parse(e.detail);

          let info = { source: 'FromMSToClient', response: response }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'DETACH_PLUGIN',
            3,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(
            parseInt(roomId),
            parseInt(userId),
            self.connection.connectionId
          );
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          self.msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n
          med_ch.media_conference.Events.onStreamDestroyed.apply(self, [self]);
          // self.closeMyPeerConnection();
          // self.webrtcCORE.myStream.getTracks().forEach(function (track) {
          //     track.stop();
          // });

          //console.log("response",response);
        } catch (err) {
          //                        console.log("err",err);
          //console.log("errror",err)
        }
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        msgCh.documentEventListeners.push(ack.transactionId);
        transactionId = ack.transactionId;
        document.removeEventListener(
          `detach_plugin_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `detach_plugin_ack_${randomNumber.toString()}`,
        ackFunction
      );
      //             document.addEventListener("detach_plugin_ack_"+randomNumber.toString(), function(evnt) {
      //                 var ack = JSON.parse(evnt.detail);
      //                 msgCh.documentEventListeners.push(ack.transactionId);
      //                 document.addEventListener(ack.transactionId, function(e) {
      //                     try{
      //                         self.removeListener("document",ack.transactionId,true); //no i18n
      //                         self.removeListener("document","detach_plugin_ack_"+randomNumber.toString(),true); //no i18n
      //                         var response = JSON.parse(e.detail);
      //
      //                         var info = {"source":"FromMSToClient","response":response}; //no i18n
      //                         var actionSegment = self.msgCh.createActionSegment("DETACH_PLUGIN",3,new Date().getTime(),info); //no i18n
      //                         var relationalIds=[];
      //                         relationalIds.push(parseInt(roomId),parseInt(userId),self.connection.connectionId);
      //                         var action = self.msgCh.createAction(actionSegment,relationalIds);
      //                         self.msgCh.createModuleASAndSend(roomId,"DETACH_PLUGIN",action); //no i18n
      //
      //                         // self.closeMyPeerConnection();
      //                         // self.webrtcCORE.myStream.getTracks().forEach(function (track) {
      //                         //     track.stop();
      //                         // });
      //
      //                         //console.log("response",response);
      //                     }catch(err){
      //                         self.removeListener("document",ack.transactionId,true); //no i18n
      //                         self.removeListener("document","detach_plugin_ack_"+randomNumber.toString(),true); //no i18n
      // //                        console.log("err",err);
      //                         //console.log("errror",err)
      //                     }
      //                 });
      //                 media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
      //                     if(o.transactionId == ack.transactionId){
      //                         var event = new CustomEvent(o.transactionId,{'detail':o.detail});  //no i18n
      //                         document.dispatchEvent(event);
      //                     }
      //                 })
      //             })

      req.Events.onError = function(error) {
        self.Errors.onError.apply(self, [
          msgCh.cs_proto.Errors.PUBLISH_STREAM_FAILED
        ]);
      };
    },
    toggleVideo: function(resolve, reject, toggleSource) {
      if (
        this.webrtcCORE &&
        this.webrtcCORE.myStream &&
        this.webrtcCORE.myStream.getVideoTracks().length > 0
      ) {
        // var videoStatus = this.webrtcCORE.options.video;
        let videoStatus = this.avOptions.video.hasVideo;
        let { connectionId } = this.connection;
        let { msgCh } = this.connection;
        let self = this;
        let mediaParams = {
          sessionId: connectionId,
          handleId: this.pluginId,
          eventParams: {
            audio: this.avOptions.audio.hasAudio,
            video: !videoStatus,
            streamId: this.streamId
          }
        }; //no i18n
        let randomNumber = msgCh.generateRandomNumber('video_property_stream'); //no i18n

        let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        let actionSegment = self.msgCh.createActionSegment(
          'VIDEO_PROPERTY_CHANGE',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        let relationalIds = [];
        relationalIds.push(
          parseInt(roomId),
          parseInt(userId),
          this.connection.connectionId,
          self.pluginId
        );
        let action = self.msgCh.createAction(actionSegment, relationalIds);
        self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        let req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.VIDEO_PROPERTY_CHANGE,
          'video_property_stream',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
        let transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);

            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'VIDEO_PROPERTY_CHANGE',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              parseInt(roomId),
              parseInt(userId),
              self.connection.connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n

            if (response.configured == 'ok') {
              self.webrtcCORE.myStream.getVideoTracks()[0].enabled = !videoStatus;
              self.webrtcCORE.options.video = !videoStatus;
              self.avOptions.video.hasVideo = !videoStatus;
              if (self.avOptions.video.hasVideo) {
                self.avOptions.video.reason = 0;
              } else {
                self.avOptions.video.reason = 2;
              }
              let options = {
                audio: self.avOptions.audio.hasAudio,
                video: self.avOptions.video.hasVideo,
                pluginId: self.pluginId,
                plugin: self
              };
              self.Events.onAudioVideoPropertyChange.apply(self, [options]);
              if (resolve) {
                resolve();
              }
            }
            //                            else{
            //                                //todo:-video toggle failed
            //                            }
          } catch (err) {
            //                            console.log("errror",err)
          }
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `video_property_stream_ack_${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `video_property_stream_ack_${randomNumber.toString()}`,
          ackFunction
        );
        //                 document.addEventListener("video_property_stream_ack_"+randomNumber.toString(), function(evnt) {
        //                     var ack = JSON.parse(evnt.detail);
        //                     msgCh.documentEventListeners.push(ack.transactionId);
        //                     document.addEventListener(ack.transactionId, function(e) {
        //                         try{
        //                             self.removeListener("document",ack.transactionId,true); //no i18n
        //                             self.removeListener("document","video_property_stream_ack_"+randomNumber.toString(),true); //no i18n
        //                             var response = JSON.parse(e.detail);
        //
        //                             var info = {"source":"FromMSToClient","response":response}; //no i18n
        //                             var actionSegment = self.msgCh.createActionSegment("VIDEO_PROPERTY_CHANGE",3,new Date().getTime(),info); //no i18n
        //                             var relationalIds=[];
        //                             relationalIds.push(parseInt(roomId),parseInt(userId),self.connection.connectionId,self.pluginId);
        //                             var action = self.msgCh.createAction(actionSegment,relationalIds);
        //                             self.msgCh.createModuleASAndSend(roomId,"VIDEO_PROPERTY_CHANGE",action); //no i18n
        //
        //                             if(response.configured=="ok"){
        //                                 self.webrtcCORE.myStream.getVideoTracks()[0].enabled = !videoStatus;
        //                                 self.webrtcCORE.options.video = !videoStatus;
        //                                 var options = {
        //                                     audio:self.webrtcCORE.options.audio,
        //                                     video:self.webrtcCORE.options.video,
        //                                     pluginId:self.pluginId,
        //                                     plugin:self
        //                                 }
        //                                 self.Events.onAudioVideoPropertyChange.apply(self,[options]);
        //                                 if(resolve){
        //                                     resolve();
        //                                 }
        //                             }
        // //                            else{
        // //                                //todo:-video toggle failed
        // //                            }
        //                         }catch(err){
        //                             self.removeListener("document",ack.transactionId,true); //no i18n
        //                             self.removeListener("document","video_property_stream_ack_"+randomNumber.toString(),true); //no i18n
        // //                            console.log("errror",err)
        //                         }
        //                     });
        //                     media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
        //                         if(o.transactionId == ack.transactionId){
        //                             var event = new CustomEvent(o.transactionId,{'detail':o.detail});  //no i18n
        //                             document.dispatchEvent(event);
        //                         }
        //                     })
        //                 })

        req.Events.onError = function(error) {
          self.Errors.onError.apply(self, [
            msgCh.cs_proto.Errors.PUBLISH_STREAM_FAILED
          ]);
        };
      } else {
        if (this.webrtcCORE.myStream.getVideoTracks().length == 0) {
          //i.e. the usert doesnt have an audio track to toggle
          let failure = {
            handle: this,
            reason: 'mute/unmute', //no i18n
            error: 'There are no video tracks to toggle.' //no i18n
          };
          this.Errors.onError.apply(this, [failure]);
        }
      }
    },

    toggleAudio: function(resolve, reject, toggleSource) {
      if (
        this.webrtcCORE &&
        this.webrtcCORE.myStream &&
        this.webrtcCORE.myStream.getAudioTracks().length > 0
      ) {
        // var audioStatus = this.webrtcCORE.options.audio;
        let audioStatus = this.avOptions.audio.hasAudio;

        var { connectionId } = this.connection;
        let { msgCh } = this.connection;
        var { connectionId } = this.connection;
        let mediaParams = {
          sessionId: connectionId,
          handleId: this.pluginId,
          eventParams: {
            audio: !audioStatus,
            video: this.avOptions.video.hasVideo,
            streamId: this.streamId
          }
        }; //no i18n
        let randomNumber = msgCh.generateRandomNumber('audio_property_stream'); //no i18n
        let self = this;

        let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        let actionSegment = self.msgCh.createActionSegment(
          'AUDIO_PROPERTY_CHANGE',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        let relationalIds = [];
        relationalIds.push(
          parseInt(roomId),
          parseInt(userId),
          this.connection.connectionId,
          self.pluginId
        );
        let action = self.msgCh.createAction(actionSegment, relationalIds);
        self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        let req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.AUDIO_PROPERTY_CHANGE,
          'audio_property_stream',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n

        let transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);
            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'AUDIO_PROPERTY_CHANGE',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              parseInt(roomId),
              parseInt(userId),
              self.connection.connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n

            if (response.configured == 'ok') {
              self.webrtcCORE.myStream.getAudioTracks()[0].enabled = !audioStatus;
              self.webrtcCORE.options.audio = !audioStatus;
              self.avOptions.audio.hasAudio = !audioStatus;
              if (self.avOptions.audio.hasAudio) {
                self.avOptions.audio.hasReason = 0;
              } else {
                self.avOptions.audio.hasReason = 2;
              }
              let options = {
                audio: self.avOptions.audio.hasAudio,
                video: self.avOptions.video.hasVideo,
                pluginId: self.pluginId,
                plugin: self
              };
              self.Events.onAudioVideoPropertyChange.apply(self, [options]);
              if (resolve) {
                resolve();
              }
            }
          } catch (error) {}
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `audio_property_stream_ack_${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `audio_property_stream_ack_${randomNumber.toString()}`,
          ackFunction
        );
        // document.addEventListener("audio_property_stream_ack_"+randomNumber.toString(), function(evnt) {
        //     var ack = JSON.parse(evnt.detail);
        //     msgCh.documentEventListeners.push(ack.transactionId);
        //     document.addEventListener(ack.transactionId, function(e) {
        //         try{
        //             self.removeListener("document",ack.transactionId,true); //no i18n
        //             self.removeListener("document","audio_property_stream_ack_"+randomNumber.toString(),true); //no i18n
        //             var response = JSON.parse(e.detail);
        //
        //             var info = {"source":"FromMSToClient","response":response}; //no i18n
        //             var actionSegment = self.msgCh.createActionSegment("AUDIO_PROPERTY_CHANGE",3,new Date().getTime(),info); //no i18n
        //             var relationalIds=[];
        //             relationalIds.push(parseInt(roomId),parseInt(userId),self.connection.connectionId,self.pluginId);
        //             var action = self.msgCh.createAction(actionSegment,relationalIds);
        //             self.msgCh.createModuleASAndSend(roomId,"AUDIO_PROPERTY_CHANGE",action); //no i18n
        //
        //             if(response.configured=="ok"){
        //                 self.webrtcCORE.myStream.getAudioTracks()[0].enabled = !audioStatus;
        //                 self.webrtcCORE.options.audio = !audioStatus;
        //                 var options = {
        //                     audio:self.webrtcCORE.options.audio,
        //                     video:self.webrtcCORE.options.video,
        //                     pluginId:self.pluginId,
        //                     plugin:self
        //                 }
        //                 self.Events.onAudioVideoPropertyChange.apply(self,[options]);
        //                 if(resolve){
        //                     resolve();
        //                 }
        //             }
        //         }catch(error){
        //             self.removeListener("document","audio_property_stream_ack_"+randomNumber.toString(),true); //no i18n
        //             self.removeListener("document",ack.transactionId,true); //no i18n
        //         }
        //     });
        //     media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
        //         if(o.transactionId == ack.transactionId){
        //             var event = new CustomEvent(o.transactionId,{'detail':o.detail}); //no i18n
        //             document.dispatchEvent(event);
        //         }
        //     })
        // })

        req.Events.onError = function(error) {
          self.Errors.onError.apply(self, [
            msgCh.cs_proto.Errors.PUBLISH_STREAM_FAILED
          ]);
        };
      } else {
        if (this.webrtcCORE.myStream.getAudioTracks().length == 0) {
          //i.e. the usert doesnt have an audio track to toggle
          let failure = {
            handle: this,
            reason: 'mute/unmute', //no i18n
            error: 'There are no audio tracks to toggle.' //no i18n
          };
          this.Errors.onError.apply(this, [failure]);
        }
      }
    },

    toggleStream: function(e) {
      let { msgCh } = this.connection;
      let self = this;
      let mediaParams = {
        sessionId: this.connection.connectionId,
        handleId: this.pluginId,
        eventParams: { jsep_offer: this.webrtcCORE.mySdp }
      }; //no i18n
      if (this.liveStream) {
        self.unpublish();
        // var req = msgCh.sendReq(msgCh.cs_proto.MediaEvents.UNPUBLISH_STREAM,"unpublishing_stream",msgCh.cs_proto.ExchangeEndPointTypes.SERVER,undefined,msgCh.cs_proto.EventPipeLines.MEDIA,mediaParams);  //no i18n
      } else {
        // var req = msgCh.sendReq(msgCh.cs_proto.MediaEvents.PUBLISH_STREAM,"publishing_stream",msgCh.cs_proto.ExchangeEndPointTypes.SERVER,undefined,msgCh.cs_proto.EventPipeLines.MEDIA,mediaParams);  //no i18n
        // this.liveStream = true;
        self.publish();
      }
    },
    bindWebrtcEvents: function() {
      let self = this;
      this.webrtcEvents.iceStateChanged = function(iceState) {
        self.iceState = iceState;
      };

      this.webrtcEvents.sdpOffer = function(error, jsep) {
        //sending configure request to start publish process
        if (error) {
          //TODO: throw Unable to publish Error
          return;
        }
        self.configure(jsep);
      };

      this.webrtcEvents.sdpAnswer = function(error, jsep) {
        //should not be triggered for publisher
        //TODO:throw Warning
      };

      this.webrtcEvents.remoteJsepProcessed = function(error, responseObj) {
        //just log this event if set to debug Mode
        if (error) {
          //TODO: throw ' Error while Setting remote Description'
          return;
        }
        media_channel.Debug.log(responseObj);
      };

      this.webrtcEvents.sdpWithIce = function(sdp) {
        let config = self.webrtcCORE;
        config.mySdp = {
          type: config.pc.localDescription.type, //no i18n
          sdp: config.pc.localDescription.sdp //no i18n
        };
        if (config.trickle === false) {
          config.mySdp.trickle = false;
        }
        config.sdpSent = true;
        //TODO: send SDP to server
      };

      this.webrtcEvents.trickleIceCandidate = function(candidate) {
        if (candidate.completed && candidate.completed === true) {
          media_channel.Debug.log('Sending Ice Completed Event');
          self.sendTrickleCandidate(candidate);
        } else {
          media_channel.Debug.log('Sending Ice Candidate ');
          self.sendTrickleCandidate(candidate);
        }
      };
    },

    // Loop to check for no slow links and increase the bitrate of the publisher - simulcast /r
    /*checkForNoSlowLinks:function(interval){
            media_channel.Debug.log("Publisher Checking for no slow links : " + interval);
            var time = new Date().getTime();
            media_channel.Debug.log("Time : " + new Date(time).toLocaleTimeString("en-US"));
            var self = this;

            self.bitrateChangeLoop = setTimeout(function(){
                media_channel.Debug.log("Current bit rate : ", self.webrtcCORE.bitrate.value);
                self.changeBitRate((parseInt(self.webrtcCORE.bitrate.value) + 200000));
                media_channel.Debug.log("New bit rate : ", (parseInt(self.webrtcCORE.bitrate.value) + 200000));
                interval=interval+60000;
                self.checkForNoSlowLinks(interval);
            },interval);
        },*/

    increaseBitrate: function(interval) {
      try {
        let self = this;
        let time = new Date().getTime();
        //console.log("Increase Loop Time : " + new Date(time).toLocaleTimeString("en-US"));

        self.increaseBitrateLoop = setTimeout(() => {
          //console.log("Current bit rate : ", self.webrtcCORE.bitrate.value);
          let transmitBitrate = parseInt(
            self.statsResult.bandwidth.googTransmitBitrate
          );
          //console.log("Current transmit bitrate : ", transmitBitrate);
          let newBitRate = transmitBitrate + 200000;

          if (newBitRate - self.webrtcCORE.bitrate.value > 150000) {
            self.changeBitRate(newBitRate);
            //console.log("Current bit rate : ", self.webrtcCORE.bitrate.value);
            //console.log("Current transmit bitrate : ", transmitBitrate);
            //console.log("New bit rate : ", newBitRate);
            //console.log("Bitrate increased by 200kb. Next increase will happen after " + (self.increaseInterval/1000) + " seconds");
            self.increaseCounter = 6;
          } else {
            //console.log("Skipping the increase bitrate call this time...");
            let dummy; //codecheck
          }

          self.increaseBitrate(self.increaseInterval);
        }, interval);
      } catch (e) {
        //console.log("Error in increase bitrate function --> ",e);
      }
    },

    decreaseBitrate: function(interval) {
      try {
        let self = this;
        let time = new Date().getTime();
        //console.log("Decrease Loop Time : " + new Date(time).toLocaleTimeString("en-US"));

        self.decreaseBitrateLoop = setTimeout(() => {
          let currentGoogAvailableSendBandwidth =
            self.statsResult.bandwidth.googAvailableSendBandwidth;
          //console.log("Current Available Bandwidth : ", currentGoogAvailableSendBandwidth);
          if (
            self.increaseCounter < 1 &&
            currentGoogAvailableSendBandwidth > 200000
          ) {
            //to wait for 60 seconds after increasebitrate operation
            if (self.decreaseCounter != 12) {
              //to ensure maximum bitrate has not yet reached
              if (
                currentGoogAvailableSendBandwidth -
                  self.statsResult.bandwidth.googTransmitBitrate >
                200000
              ) {
                self.decreaseCounter += 1;
                //if this runs for 60 seconds, then it means maximum bitrate has been reached
              }
              if (currentGoogAvailableSendBandwidth == 2048000) {
                //it runs for only first time. This is used for network test
                var newBitRate =
                  parseInt(self.statsResult.bandwidth.googTransmitBitrate) -
                  50000;
                //console.log("Current bit rate : ", self.webrtcCORE.bitrate.value);
                if (newBitRate < 128000) {
                  newBitRate = 128000;
                }
                self.changeBitRate(newBitRate); //this value will be the correct bitrate of every publisher
                self.decreaseCounter = 0; //bitrate has been reduced
                //console.log("New bit rate : ", newBitRate);
              } else if (
                self.webrtcCORE.bitrate.value -
                  currentGoogAvailableSendBandwidth >
                100000
              ) {
                //it runs for every 10 seconds
                var newBitRate =
                  parseInt(currentGoogAvailableSendBandwidth) - 50000; //if the (REMB - available bitrate) >100kb, reduce bitrate equivalent to available bandwidth
                if (newBitRate < 128000) {
                  newBitRate = 128000;
                }
                if (self.webrtcCORE.bitrate.value - newBitRate > 50000) {
                  //console.log("Current bit rate : ", self.webrtcCORE.bitrate.value);
                  self.changeBitRate(newBitRate);
                  self.decreaseCounter = 0; //bitrate has been reduced
                  //console.log("New bit rate : ", newBitRate);
                }
              }
            } else {
              //since maximum bitrate has been reached, set new bitrate equivalent to transmit bitrate
              var newBitRate =
                parseInt(self.statsResult.bandwidth.googTransmitBitrate) -
                50000;
              //console.log("Current bit rate : ", self.webrtcCORE.bitrate.value);
              if (newBitRate < 128000) {
                newBitRate = 128000;
              }
              self.changeBitRate(newBitRate);
              self.decreaseCounter = 0; //bitrate has been reduced
              self.increaseInterval += 60000; //increasing the interval of increaseBitrateLoop since maximum bitrate has been reached
              //console.log("New bit rate : ", newBitRate);
            }
          } else {
            self.increaseCounter -= 1;
            //when this happens for 6 times, increase counter will become 0 and normal decreasebitrate operation continues
          }

          interval = 10000;
          self.decreaseBitrate(interval);
        }, interval);
      } catch (e) {
        //console.log("Error in decrease bitrate function --> ",e);
      }
    },

    /*//Based on NACKS value, check if bitrate change is required for a time period loop - simulcast /r
        handleSlowLink:function(responseString){
            var self=this;
            try{
                var sender=self.pluginId;
                var nacks=responseString.nacks;
                self.webrtcCORE.nacksArray.push(nacks);
                var lastNackReceivedTime = new Date().getTime();
                self.webrtcCORE.lastNackReceivedTime = lastNackReceivedTime;
                var lastNackReceivedTimeString = new Date(lastNackReceivedTime).toLocaleTimeString("en-US"); //no i18n

                function getSum(total, num) {
                    return total + num;
                }

                var totalNacksValue = (self.webrtcCORE.nacksArray.length!=0)?(self.webrtcCORE.nacksArray.reduce(getSum))/self.webrtcCORE.nacksArray.length:0;
                media_channel.Debug.log("Publisher Id: " + sender + " Current nacks count: " + nacks + " Average nacks count : " + totalNacksValue + " Nacks Array : " + self.webrtcCORE.nacksArray + "  Timestamp : " + lastNackReceivedTimeString);

                if(lastNackReceivedTime - self.webrtcCORE.timeStamp >= 10000){ // Delay is temperorily provided. May be removed in future... /r
                    self.webrtcCORE.timeStamp = new Date().getTime();
                    self.webrtcCORE.nacksArray = [];
                    self.bitRateChange(totalNacksValue);
                }
            }

            catch(e){
                //TODO: throw or at least log why handling of message fails
            }
        },*/

    /*//Bitrate change function for publisher based on NACKS value - simulcast /r
        bitRateChange:function(totalNacksValue){
            var self=this;
            var currentBitRate = self.webrtcCORE.bitrate.value;
            var newBitRate;

            if(currentBitRate >= 128000){
                /*if(totalNacksValue < 5){
                    temp1 = temp + 50000;
                    }*/
    /*//TODO: This use case can be handled in  future
        if(totalNacksValue >= 8 && totalNacksValue < 40){
            newBitRate = currentBitRate - 50000;
        }
        else if(totalNacksValue >= 40 && totalNacksValue < 50){
            newBitRate = currentBitRate - 100000;
        }
        else if(totalNacksValue >= 50 && totalNacksValue < 65){
            newBitRate = currentBitRate - 150000;
        }
        else if(totalNacksValue >= 65 && totalNacksValue < 80){
            newBitRate = currentBitRate - 200000;
        }
        else if(totalNacksValue >= 80 && totalNacksValue <100){
            newBitRate = currentBitRate - 250000;
        }
        else if(totalNacksValue >= 100 && totalNacksValue < 135){
            newBitRate = currentBitRate - 300000;
        }
        else if(totalNacksValue >= 135 && totalNacksValue < 160){
            newBitRate = currentBitRate - 350000;
        }
        else if(totalNacksValue >= 160 && totalNacksValue <185){
            newBitRate = currentBitRate - 400000;
        }
        else if(totalNacksValue >= 185 && totalNacksValue < 210){
            newBitRate = currentBitRate - 450000;
        }
        else if(totalNacksValue >= 210){
            newBitRate = currentBitRate - 500000;
        }
    }

    else {
        newBitRate = 128000;
    }

    if(newBitRate){
        if(newBitRate < 128000){
            newBitRate = 128000;
        }
        self.changeBitRate(newBitRate);
    }

    else {
        media_channel.Debug.log("No Bit rate changes happened...");
    }
},*/

    //Bitrate change function communication with the messaging server - simulcast /r
    changeBitRate: function(bitRateValue) {
      try {
        if (bitRateValue) {
          let bitrate = bitRateValue;
          let { connectionId } = this.connection;
          let { msgCh } = this.connection;
          let mediaParams = {
            sessionId: connectionId,
            handleId: this.pluginId,
            eventParams: { bitrate: bitrate }
          }; //no i18n
          let randomNumber = msgCh.generateRandomNumber('bit_rate_change'); //no i18n
          let self = this;

          let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'BITRATE_CHANGE',
            1,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(
            parseInt(roomId),
            parseInt(userId),
            this.connection.connectionId,
            self.pluginId
          );
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

          let req = msgCh.sendReq(
            msgCh.cs_proto.MediaEvents.BITRATE_CHANGE,
            'bit_rate_change',
            msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
            undefined,
            msgCh.cs_proto.EventPipeLines.MEDIA,
            mediaParams,
            randomNumber
          ); //no i18n

          let transactionId;
          function respFunction(e) {
            document.removeEventListener(transactionId, respFunction);
            try {
              let response = JSON.parse(e.detail);

              let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
              let actionSegment = self.msgCh.createActionSegment(
                'BITRATE_CHANGE',
                1,
                new Date().getTime(),
                info
              ); //no i18n
              let relationalIds = [];
              relationalIds.push(
                parseInt(roomId),
                parseInt(userId),
                self.connection.connectionId,
                self.pluginId
              );
              let action = self.msgCh.createAction(
                actionSegment,
                relationalIds
              );
              let key = {};
              key.type = 0;
              let keyPair = {};
              keyPair[randomNumber] = transactionId;
              key.keyPair = keyPair;
              self.msgCh.createModuleASAndSend(
                roomId,
                transactionId,
                action,
                key
              ); //no i18n

              if (response.configured == 'ok') {
                self.webrtcCORE.bitrate.value = bitrate;
                let date = new Date().getTime();
                media_channel.Debug.high(
                  `Acknowledgement received for change of bitrate value to : ${bitRateValue} Time : ${new Date(
                    date
                  ).toLocaleTimeString()} in milliseconds --> ${date} plugin id --> ${
                    self.pluginId
                  } stream id --> ${self.streamId}`
                ); //no i18n
                //self.webrtcCORE.nacksArray = [];
              }
            } catch (error) {}
          }
          function ackFunction(evnt) {
            let ack = JSON.parse(evnt.detail);
            msgCh.documentEventListeners.push(ack.transactionId);
            transactionId = ack.transactionId; //no i18n
            document.removeEventListener(
              `bit_rate_change_ack_${randomNumber.toString()}`,
              ackFunction
            );
            document.addEventListener(transactionId, respFunction);
            media_channel.messages_without_ack.find(o => {
              //possibilty tht the response was received before the ack
              if (o.transactionId == ack.transactionId) {
                let event = new CustomEvent(o.transactionId, {
                  detail: o.detail
                }); //no i18n
                document.dispatchEvent(event);
              }
            });
          }
          document.addEventListener(
            `bit_rate_change_ack_${randomNumber.toString()}`,
            ackFunction
          );
          // document.addEventListener("bit_rate_change_ack_"+randomNumber.toString(), function(evnt) {
          //     var ack = JSON.parse(evnt.detail);
          //     msgCh.documentEventListeners.push(ack.transactionId);
          //     document.addEventListener(ack.transactionId, function(e) {
          //         try{
          //             self.removeListener("document",ack.transactionId,true); //no i18n
          //             self.removeListener("document","bit_rate_change_ack_"+randomNumber.toString(),true); //no i18n
          //             var response = JSON.parse(e.detail);
          //             if(response.configured=="ok"){
          //                 //self.webrtcCORE.bitrate.value = bitrate;
          //                 media_channel.Debug.log("Acknowledgement received for change of bitrate value to : " , bitRateValue);
          //                 //self.webrtcCORE.nacksArray = [];
          //             }
          //         }catch(error){
          //             self.removeListener("document","bit_rate_change_ack_"+randomNumber.toString(),true); //no i18n
          //             self.removeListener("document",ack.transactionId,true); //no i18n
          //         }
          //     });
          //     media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
          //         if(o.transactionId == ack.transactionId){
          //             var event = new CustomEvent(o.transactionId,{'detail':o.detail}); //no i18n
          //             document.dispatchEvent(event);
          //         }
          //     })
          // })
        }
      } catch (e) {
        media_channel.Debug.log('Error in changebitrate function', e);
      }
    },

    initGetStats: function() {
      let self = this;
      let flag = false;

      /*if(/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
                window.getStats(self.webrtcCORE.pc, event.streams[0].getTracks()[0], function(result) {
                    media_channel.Debug.log("Inside getstats loop...");
                    previewGetStatsResult(self.webrtcCORE.pc, result);
                }, 1000);
                return;
            }*/

      window.getStats(
        self.webrtcCORE.pc,
        result => {
          media_channel.Debug.log('Inside getstats loop...');
          previewGetStatsResult(self.webrtcCORE.pc, result);
        },
        10000
      ); //timer will run for every 10 seconds

      function previewGetStatsResult(peer, result) {
        if (
          result.connectionType.remote.candidateType.indexOf('relayed') !== -1
        ) {
          result.connectionType.remote.candidateType = 'TURN'; //no i18n
        } else {
          result.connectionType.remote.candidateType = 'STUN'; //no i18n
        }

        //document.getElementById('remoteIceType').innerHTML = result.connectionType.remote.candidateType;
        //document.getElementById('externalIPAddressRemote').innerHTML = result.connectionType.remote.ipAddress.join(', ');
        //document.getElementById('remoteTransport').innerHTML = result.connectionType.remote.transport.join(', ');

        if (
          result.connectionType.local.candidateType.indexOf('relayed') !== -1
        ) {
          result.connectionType.local.candidateType = 'TURN'; //no i18n
        } else {
          result.connectionType.local.candidateType = 'STUN'; //no i18n
        }

        //document.getElementById('localIceType').innerHTML = result.connectionType.local.candidateType;
        //document.getElementById('externalIPAddressLocal').innerHTML = result.connectionType.local.ipAddress.join(', ');
        //document.getElementById('localTransport').innerHTML = result.connectionType.local.transport.join(', ');

        //document.getElementById('encryptedAs').innerHTML = result.encryption;

        //document.getElementById('videoResolutionsForSenders').innerHTML = result.resolutions.send.width + 'x' + result.resolutions.send.height;
        //document.getElementById('videoResolutionsForReceivers').innerHTML = result.resolutions.recv.width + 'x' + result.resolutions.recv.height;

        //document.getElementById('totalDataForSenders').innerHTML = bytesToSize(result.audio.bytesSent + result.video.bytesSent);
        //document.getElementById('totalDataForReceivers').innerHTML = bytesToSize(result.audio.bytesReceived + result.video.bytesReceived);

        //document.getElementById('codecsSend').innerHTML = result.audio.send.codecs.concat(result.video.send.codecs).join(', ');
        //document.getElementById('codecsRecv').innerHTML = result.audio.recv.codecs.concat(result.video.recv.codecs).join(', ');

        //document.getElementById('bandwidthSpeed').innerHTML = bytesToSize(result.bandwidth.speed);

        //document.getElementById('framerateMean').innerHTML = bytesToSize(result.video.send.framerateMean);
        //document.getElementById('bitrateMean').innerHTML = bytesToSize(result.video.send.bitrateMean);

        //document.getElementById('audio-latency').innerHTML = result.audio.latency + 'ms';
        //document.getElementById('video-latency').innerHTML = result.video.latency + 'ms';

        //document.getElementById('audio-packetsLost').innerHTML = result.audio.packetsLost;
        //document.getElementById('video-packetsLost').innerHTML = result.video.packetsLost;

        let { browser } = media_channel.webRTCAdapter.browserDetails;
        if (browser == 'firefox') {
          //console.log("Results --> ", result.bandwidth.bitrateMean);
          let dummy; //code check
        }

        self.statsResult = result;
        window.getStatsResult = result;
        //console.log("Available bandwidth--> " , self.statsResult.bandwidth.googAvailableSendBandwidth);
        //console.log("Current bandwidth--> ", self.statsResult.bandwidth.googTransmitBitrate);
        if (flag == false && result) {
          flag = true;
          self.decreaseBitrate(self.startingDecreaseInterval);
          self.increaseBitrate(self.increaseInterval);
        }

        //media_channel.Debug.log("Result --> " , result);
      }

      function bytesToSize(bytes) {
        /*var k = 1000;
                var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; //no i18n
                if (bytes <= 0) {
                    return '0 Bytes'; //no i18n
                }
                var i = parseInt(Math.floor(Math.log(bytes) / Math.log(k)), 10);

                if(!sizes[i]) {
                    return '0 Bytes'; //no i18n
                }

                return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];*/

        let bits = bytes * 8;
        let k = 1000;
        let sizes = ['Bits', 'Kb', 'Mb', 'Gb', 'Tb']; //no i18n
        if (bits <= 0) {
          return '0 Bits'; //no i18n
        }
        let i = parseInt(Math.floor(Math.log(bits) / Math.log(k)), 10);

        if (!sizes[i]) {
          return '0 Bits'; //no i18n
        }

        return `${(bits / Math.pow(k, i)).toPrecision(3)} ${sizes[i]}`;
      }
    },

    //Based on the resolution type set the get user media constraints - simulcast /r
    getScreenResolution: function(video, resType) {
      let width = 0,
        height = 0,
        maxHeight = 0;
      if (resType === 'lowres') {
        // Small resolution, 4:3
        height = 240;
        //maxHeight = 240;
        width = 320;
      } else if (resType === 'lowres-16:9') {
        // Small resolution, 16:9
        height = 180;
        //maxHeight = 180;
        width = 320;
      } else if (
        resType === 'hires' ||
        resType === 'hires-16:9' ||
        resType === 'hdres'
      ) {
        // High(HD) resolution is only 16:9
        height = 720;
        //maxHeight = 720;
        width = 1280;
      } else if (resType === 'fhdres') {
        // Full HD resolution is only 16:9
        height = 1080;
        //maxHeight = 1080;
        width = 1920;
      } else if (resType === '4kres') {
        // 4K resolution is only 16:9
        height = 2160;
        //maxHeight = 2160;
        width = 3840;
      } else if (resType === 'stdres') {
        // Normal resolution, 4:3
        height = 480;
        //maxHeight = 480;
        width = 640;
      } else if (resType === 'stdres-16:9') {
        // Normal resolution, 16:9
        height = 360;
        //maxHeight = 360;
        width = 640;
      } else {
        media_channel.Debug.log('Default video setting is stdres 4:3');
        height = 480;
        //maxHeight = 480;
        width = 640;
      }
      video.height = { ideal: height }; //no i18n
      video.width = { ideal: width }; //no i18n
      return video;
    },

    handleMessage: function(data) {
      let { browser } = media_channel.webRTCAdapter.browserDetails;
      let self = this;
      try {
        let responseEvent = JSON.parse(data);
        if (responseEvent.status == 'RELAY') {
          //since the events would only be relayed
          if (responseEvent.mediaEvent.webrtcEvent) {
            if (responseEvent.mediaEvent.webrtcEvent.event == 'WEBRTC_UP') {
              //no i18n
              var responseString = JSON.parse(responseEvent.responseString);
              if (responseString.ZMediaServer == 'webrtcup') {
                self.Events.onWebrtcup.apply(self, [self]);
                self.webrtcCORE.webrtcUP = true;
                //self.webrtcCORE.screenShareInProgress = true;
                //self.Events.onWebrtcup.apply(self,[responseString]);

                if (self.source == 1 && browser != 'firefox') {
                  // enable only for a/v and not for screenshare
                  //getStats Testing
                  if (!self.firedOnce) {
                    self.firedOnce = true;
                    if (self.webrtcCORE.options.simulcast === false) {
                      //self.changeBitRate(1024000);
                      if (self.webrtcCORE.options.isTestPage === false) {
                        //normal page
                        self.initGetStats();
                      } else {
                        //test page
                        self.Events.initGetStats.apply(self, [self]);
                      }
                    } else {
                      //self.changeBitRate(1536000);
                      //console.log("Setting Initial Bit rate to 1.5 Mbps");
                      if (self.webrtcCORE.options.isTestPage === false) {
                        //normal page
                        self.initGetStats();
                      } else {
                        //test page
                        self.Events.onWebrtcup.apply(self, [self]);
                        self.Events.initGetStats.apply(self, [self]);
                      }
                    }
                  }
                }
              }
              /*//If slowlink is detected , call handle slow link function - simulcast /r
                            else if(responseString.ZMediaServer=="slowlink"){
                                if(self.webrtcCORE.options.simulcast === true){
                                    if(self.webrtcCORE.options.isTestPage === false){ //normal page
                                        //self.handleSlowLink(responseString);
                                    }
                                    else{ //test page
                                        self.Events.onSlowLink.apply(self,[responseString]);
                                    }
                                }
                            } */
            } else if (
              responseEvent.mediaEvent.webrtcEvent.event == 'SLOW_LINK'
            ) {
              //no i18n
              var responseString = JSON.parse(responseEvent.responseString);
              //If slowlink is detected , call handle slow link function - simulcast /r
              if (responseString.ZMediaServer == 'slowlink') {
                if (self.webrtcCORE.options.simulcast === true) {
                  if (self.webrtcCORE.options.isTestPage === false) {
                    //normal page
                    //self.handleSlowLink(responseString);
                    media_channel.Debug.log('slowlink detected');
                  } else {
                    //test page
                    //self.Events.onSlowLink.apply(self,[responseString]);
                  }
                }
              }
            } else if (
              responseEvent.mediaEvent.webrtcEvent.event == 'SDP_ANSWER'
            ) {
              //no i18n
              //handleRemoteJsep here
              if (responseEvent.responseString) {
                media_channel.processRemoteJsep(self, {
                  jsep: JSON.parse(responseEvent.responseString)
                });
              }
            }
            //else if(responseEvent.mediaEvent.webrtcEvent.event == "SDP_OFFER"){ //This event should not be called for publisher   //no i18n
            //TODO: throw Warning for this event
            //}
            else if (responseEvent.mediaEvent.webrtcEvent.event == 'HANG_UP') {
              //no i18n
              self.Errors.onError.apply(self, [
                msgCh.cs_proto.Errors.CONNECTION_CLOSED
              ]); //TODO: this event should be an error or destroyed event ?
            } else if (
              responseEvent.mediaEvent.webrtcEvent.event == 'TALKING'
            ) {
              //no i18n
              var response = JSON.parse(responseEvent.responseString);
              self.Events.onTalking.apply(self, [response]);
            } else if (
              responseEvent.mediaEvent.webrtcEvent.event == 'STOPPED_TALKING'
            ) {
              //no i18n
              var response = JSON.parse(responseEvent.responseString);
              // self.Events.onStoppedTalking.apply(self,[response]);
            }
          } else if (responseEvent.mediaEvent.taskEvent) {
            //Catching the response for Bitrate change function from Janus - simulcast /r
            if (responseEvent.mediaEvent.taskEvent.event == 'BITRATE_CHANGE') {
              var responseString = JSON.parse(responseEvent.responseString);
              self.webrtcCORE.bitrate.value = responseString.bitrate;
              //self.webrtcCORE.nacksArray = [];
              let date = new Date().getTime();
              media_channel.Debug.high(
                `RELAY Response from Janus for Bitrate Change : ${
                  responseString.bitrate
                } Time : ${new Date(date).toLocaleTimeString()} --> ${date}`
              ); //no i18n
            } else if (
              responseEvent.mediaEvent.taskEvent.event ==
              'GOT_STREAM_FROM_CLIENT'
            ) {
              //no i18n
              var responseString = JSON.parse(responseEvent.responseString);
              self.Events.onStreamFromClient.apply(self, [responseString]);
            } else if (
              responseEvent.mediaEvent.taskEvent.event ==
              'NO_STREAM_FROM_CLIENT'
            ) {
              //no i18n
              var responseString = JSON.parse(responseEvent.responseString);
              self.Events.onStreamFromClient.apply(self, [responseString]);
            }
          }
        }
      } catch (e) {
        //TODO: throw or at least log why handling of message fails
      }
    },

    bindPluginToMediaServer: function(_pluginId) {
      let self = this;
      this.connection.msgCh.csConnection.addEventListener(
        _pluginId,
        e => {
          //Process Publisher Operations Message
          media_channel.Debug.logConnection(
            `received at plugin ${_pluginId} data->${e.data}`
          ); //no i18n
          self.handleMessage(e.data);
        },
        false
      );

      //To ensure trickle complete message is sent
      this.connection.msgCh.documentEventListeners.push(
        `trickleIceCandidate_${_pluginId}`
      );
      document.addEventListener(`trickleIceCandidate_${_pluginId}`, event => {
        let candidate = event.detail[0];
        if (candidate.completed && candidate.completed === true) {
          media_channel.Debug.log('Sending Ice Completed Event subsrciber');
          self.sendTrickleCandidate(candidate);
        }
      });
    },

    getMediaStream: function(options, selectedDevices) {
      let self = this;
      // Check whether all media sources are actually available or not
      if (options.stream) {
        try {
          this.webrtcCORE.streamExternal = true;
          this.webrtcCORE.myStream = options.stream;
          this.streamId = options.stream.id;
          this.initAndAttachToMediaServer(options.stream);
        } catch (exception) {
          this.detachHandle();
        }
      } else {
        if (this.source == 1) {
          //mic/cam
          try {
            let audioInURL = selectedDevices.audio;
            let videoInURL = selectedDevices.video;
            let isVideoValid = false;
            let isAudioValid = false;
            navigator.mediaDevices.enumerateDevices().then(
              devices => {
                let audioExist = devices.some(
                    device => device.kind === 'audioinput' //no i18n
                  ),
                  videoExist = devices.some(
                    device => device.kind === 'videoinput' //no i18n
                  );
                devices.forEach(device => {
                  if (device.deviceId == videoInURL) {
                    isVideoValid = true;
                  }
                  if (device.deviceId == audioInURL) {
                    isAudioValid = true;
                  }
                });
                // Check whether a missing device is really a problem
                // if(isVideoValid || isAudioValid) {
                let audioSend = options.audio === false ? false : true;
                let videoSend = options.video === false ? false : true;
                if (audioSend || videoSend) {
                  // We need to send either audio or video
                  let haveAudioDevice = audioSend ? audioExist : false;
                  let haveVideoDevice = videoSend ? videoExist : false;
                  if (!audioExist && !videoExist) {
                    self.Errors.onError.apply(self, [
                      self.connection.msgCh.cs_proto.Errors.MEDIA_DEVICE_ABSENT
                    ]);
                    return;
                    //TODO: throw Error "No capture device found" and return
                  } else if (audioSend && !audioExist) {
                    self.Errors.onError.apply(self, [
                      self.connection.msgCh.cs_proto.Errors.AUDIO_DEVICE_ABSENT
                    ]);
                    return;
                    //TODO: throw Error "Audio capture is required, but no capture device found" and return
                  } else if (videoSend && !videoExist) {
                    self.Errors.onError.apply(self, [
                      self.connection.msgCh.cs_proto.Errors.VIDEO_DEVICE_ABSENT
                    ]);
                    return;
                    //TODO: throw Error "Video capture is required, but no capture device found" and return
                  }
                }
                let gumConstraints = {
                  audio: audioSend,
                  video: videoSend
                };
                if (audioSend && audioInURL) {
                  if (audioInURL == 'none') {
                    gumConstraints.audio = false;
                  } else {
                    var exact = { exact: audioInURL };
                    var _device = { deviceId: exact };
                    gumConstraints.audio = _device;
                  }
                }
                if (videoSend && videoInURL) {
                  if (videoInURL == 'none') {
                    gumConstraints.video = false;
                  } else {
                    var exact = { exact: videoInURL };
                    var _device = { deviceId: exact };
                    gumConstraints.video = _device;
                  }
                }

                //If video is present , check for simulcast. If the simulcast feature is present, make the screen resolution to fhdres or else to hires /r
                if (videoSend) {
                  if (options.simulcast) {
                    videoSend = self.getScreenResolution(
                      gumConstraints.video,
                      'hires'
                    );
                  } else {
                    videoSend = self.getScreenResolution(
                      gumConstraints.video,
                      'hires'
                    );
                  }
                }

                gumConstraints.video = videoSend; //updating resolution based on simulcast

                navigator.mediaDevices.getUserMedia(gumConstraints).then(
                  stream => {
                    self.webrtcCORE.myStream = stream;
                    self.streamId = stream.id;
                    self.initAndAttachToMediaServer(stream);
                  },
                  error => {
                    self.closeMyPeerConnection(self);
                    self.detachHandle();
                    let errObj = {};
                    errObj.error = error;
                    errObj.handle = self.pluginId;
                    self.Errors.onError.apply(self, [errObj]);
                    // window.alert("erroringettingmedia" + "   " + error.toString()); //no i18n
                    // self.Errors.onError.apply(self, [error]);  //TODO: this event should be an error or destroyed event ?
                    //TODO: throw Error [callbacks.error({code: error.code, name: error.name, message: error.message});]
                  }
                );
                // }else{
                //     window.alert("Dont tamper the url. Mothalenthu vaanga");
                // }
              },
              error => {
                self.closeMyPeerConnection(self);
                self.detachHandle();
                let errObj = {};
                errObj.error = error;
                errObj.handle = self.pluginId;
                self.Errors.onError.apply(self, [errObj]);
                //TODO: Throw Unable to get MediaStream Error
              }
            );
          } catch (e) {
            //                        console.log("e",e);
          }
        } else if (this.source == 2) {
          //screenshare code
          try {
            let promise = new Promise((resolve, reject) => {
              let screenshareData = self.checkIfScreenShareExtensionHasBeenInstalledAndFetchStream(
                resolve,
                reject,
                self.webrtcCORE.screenshareFrameRate
              );
            });
            promise.then(
              response => {
                if (response) {
                  var { video } = response;
                } else {
                  //                                self.Errors.onError.apply(self,[self.connection.msgCh.cs_proto.Errors.SCREEN_SHARE_FAILED]);
                  let errObj = {};
                  errObj.error =
                    'You need to install the screenshare extension.'; //no i18n
                  errObj.handle = self.pluginId;
                  errObj.resolveBy = 'reDirectToExtensionPage()'; //no i18n
                  errObj.resolveMsg = 'Click Here.'; //no i18n
                  self.Errors.onError.apply(self, [errObj]);
                  // window.alert("Install the missing screenshare extension"); //no i18n
                }
                let audioSend = false;
                let videoSend = options.video === false ? false : video;

                let gumConstraints = {
                  audio: audioSend,
                  video: videoSend
                };

                /*//If video is present , check for simulcast. If the simulcast feature is present, make the screen resolution to fhdres or else to hires /r
                            if(videoSend){
                                videoSend = self.getScreenResolution(gumConstraints.video,"hires");
                            }

                            gumConstraints.video = videoSend;  //updating resolution */
                let { browser } = media_channel.webRTCAdapter.browserDetails;
                let { version } = media_channel.webRTCAdapter.browserDetails;
                if (browser == 'chrome' && version >= 72) {
                  navigator.mediaDevices.getDisplayMedia({ video: true }).then(
                    stream => {
                      self.webrtcCORE.myStream = stream;
                      self.streamId = stream.id;
                      let isScreenShare = true;
                      self.initAndAttachToMediaServer(stream, isScreenShare);
                    },
                    err => {
                      self.closeMyPeerConnection(self);
                      self.detachHandle(); //these handles are detached because every screenshare is its own handle.
                      media_channel.screenShareHandles.shift();
                      let errObj = {};
                      errObj.error = err.message;
                      errObj.handle = self.pluginId;
                      self.Errors.onError.apply(self, [errObj]);
                    }
                  );
                } else {
                  navigator.mediaDevices.getUserMedia(gumConstraints).then(
                    stream => {
                      self.webrtcCORE.myStream = stream;
                      self.streamId = stream.id;
                      let isScreenShare = true;
                      self.initAndAttachToMediaServer(stream, isScreenShare);
                    },
                    error => {
                      // window.alert(error.message);
                      self.closeMyPeerConnection(self);
                      self.detachHandle(); //these handles are detached because every screenshare is its own handle.
                      media_channel.screenShareHandles.shift();
                      let errObj = {};
                      errObj.error = error;
                      errObj.handle = self.pluginId;
                      self.Errors.onError.apply(self, [errObj]);
                      //TODO: throw Error [callbacks.error({code: error.code, name: error.name, message: error.message});]
                    }
                  );
                }
              },
              reject => {
                let { error } = reject;
                self.closeMyPeerConnection(self);
                self.detachHandle();
                media_channel.screenShareHandles.shift();
                let errObj = {};
                errObj.error = error;
                errObj.handle = self.pluginId;
                errObj.resolveBy = reject.resolveBy;
                errObj.resolveMsg = reject.resolveMsg;
                self.Errors.onError.apply(self, [errObj]);
                // window.alert(reject.error); //no i18n
                //TODO: throw Error [callbacks.error({code: error.code, name: error.name, message: error.message});]
              }
            );
          } catch (error) {
            self.Errors.onError.apply(self, [
              { error: error, handle: self.pluginId }
            ]);
            self.closeMyPeerConnection(self);
            self.detachHandle();
            media_channel.screenShareHandles.shift();
          }
        }
        // else if(this.source == 3){
        //     // gCombo(video, ctx, cw, ch,id);
        //     var videoId = this.sourceVideo;
        //     var video = document.getElementById(videoId);
        //     var scribbleCanvas = document.getElementById("publisher-canvas");
        //     var scribbleContext = scribbleCanvas.getContext('2d');
        //     var cw = video.clientWidth;
        //     var ch = video.clientHeight;
        //     var canvasRenderPromise = new Promise(function(resolve,reject){
        //         createComboScreen(video, scribbleContext, cw, ch, resolve, reject);
        //         gCombo(video, scribbleContext, cw, ch, resolve, reject);
        //     })
        //     canvasRenderPromise.then(function(response){
        //         try {
        //             var resultCanvas = document.getElementById(response);
        //             var canvasStream = resultCanvas.captureStream();
        //             self.webrtcCORE.myStream = canvasStream;
        //             self.streamId = canvasStream.id;
        //             self.initAndAttachToMediaServer(canvasStream);
        //         }catch(error){
        //             console.log("error in canvas render -- ",error);
        //             self.Errors.onError.apply(self, [error]);
        //             self.closeMyPeerConnection(self);
        //             self.detachHandle();
        //             window.alert(error); //no i18n
        //         }
        //     },function(error){
        //         console.log("error in canvas render -- ",error);
        //         self.Errors.onError.apply(self, [error]);
        //         self.closeMyPeerConnection(self);
        //         self.detachHandle();
        //         window.alert(error); //no i18n
        //         //TODO: throw Error [callbacks.error({code: error.code, name: error.name, message: error.message});]
        //     })
        // }
      }
    },

    sendTrickleCandidate: function(candidate) {
      var randomNumber = this.connection.msgCh.generateRandomNumber(
        'sending_trickle_completed_event'
      ); //no i18n
      let { connectionId } = this.connection;
      let { msgCh } = this.connection;
      let self = this;
      if (candidate.completed && candidate.completed === true) {
        var mediaParams = { sessionId: connectionId, handleId: this.pluginId }; //no i18n

        var info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        var actionSegment = self.msgCh.createActionSegment(
          'TRICKLE_COMPLETED',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        var relationalIds = [];
        relationalIds.push(
          parseInt(roomId),
          parseInt(userId),
          connectionId,
          self.pluginId
        );
        var action = self.msgCh.createAction(actionSegment, relationalIds);
        self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        var req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.TRICKLE_COMPLETED,
          'sending_trickle_completed_event',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
        var transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);

            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'TRICKLE_COMPLETED',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              parseInt(roomId),
              parseInt(userId),
              connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n

            media_channel.Debug.log('Ice completed event response', response);
          } catch (ex) {
            self.Errors.onError.apply(
              self,
              self.msgCh.cs_proto.Errors.INIT_PLUGIN
            );
          }
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          media_channel.Debug.log(`Trickle Ice completed Ack ${ack}`);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `sending_trickle_completed_event_ack_${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `sending_trickle_completed_event_ack_${randomNumber.toString()}`,
          ackFunction
        );
        // document.addEventListener("sending_trickle_completed_event_ack_"+randomNumber.toString(), function(evnt) {
        //     var ack = JSON.parse(evnt.detail);
        //     media_channel.Debug.log("Trickle Ice completed Ack "+ack);
        //     msgCh.documentEventListeners.push(ack.transactionId);
        //     document.addEventListener(ack.transactionId, function(e) {
        //         try{
        //             // msgCh.removeListener("document",ack.transactionId,true); //no i18n
        //             // msgCh.removeListener("document","sending_trickle_completed_event_ack_"+randomNumber.toString(),true); //no i18n
        //             var response = JSON.parse(e.detail);
        //
        //             var info = {"source":"FromMSToClient","response":response}; //no i18n
        //             var actionSegment = self.msgCh.createActionSegment("TRICKLE_COMPLETED",3,new Date().getTime(),info); //no i18n
        //             var relationalIds=[];
        //             relationalIds.push(parseInt(roomId),parseInt(userId),connectionId,self.pluginId);
        //             var action = self.msgCh.createAction(actionSegment,relationalIds);
        //             self.msgCh.createModuleASAndSend(roomId,"TRICKLE_COMPLETED",action); //no i18n
        //
        //             media_channel.Debug.log("Ice completed event response",response);
        //         }catch(ex){
        //             // msgCh.removeListener("document",ack.transactionId,true); //no i18n
        //             // msgCh.removeListener("document","sending_trickle_completed_event_ack_"+randomNumber.toString(),true); //no i18n
        //             self.Errors.onError.apply(self,self.msgCh.cs_proto.Errors.INIT_PLUGIN);
        //         }
        //     });
        //     media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
        //         if(o.transactionId == ack.transactionId){
        //             var event = new CustomEvent(o.transactionId,{'detail':o.detail});  //no i18n
        //             document.dispatchEvent(event);
        //         }
        //     })
        // })

        // req.Events.onAck = function(ack){
        //     media_channel.Debug.log("Trickle Ice completed Ack "+ack);
        // };
        //
        // req.Events.onResponse = function(response){
        //     media_channel.Debug.log("Ice completed event response",response);
        // };

        req.Events.onError = function(error) {
          media_channel.Debug.log('Ice completed event Error', error);
        };
      } else if (candidate.candidate) {
        var mediaParams = {
          sessionId: connectionId,
          handleId: self.pluginId,
          eventParams: candidate
        }; //no i18n
        var randomNumber = msgCh.generateRandomNumber(
          'sending_ice_candidate_trickle'
        ); //no i18n

        var info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        var actionSegment = self.msgCh.createActionSegment(
          'TRICKLE',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        var relationalIds = [];
        relationalIds.push(
          parseInt(roomId),
          parseInt(userId),
          connectionId,
          self.pluginId
        );
        var action = self.msgCh.createAction(actionSegment, relationalIds);
        self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        var req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.TRICKLE,
          'sending_ice_candidate_trickle',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
        // var self = this;
        var transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);

            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'TRICKLE',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              parseInt(roomId),
              parseInt(userId),
              connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n

            media_channel.Debug.log(
              'Ice candidate trickle  event response',
              response
            );
          } catch (ex) {
            self.Errors.onError.apply(
              self,
              this.msgCh.cs_proto.Errors.CREATE_CONNECTION
            );
          }
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          // ack = ack+""; //TODO:remove this line
          media_channel.Debug.log(`Trickle Ice candidate send Ack ${ack}`);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `${'sending_ice_candidate_trickle' +
              '_ack_'}${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `${'sending_ice_candidate_trickle' +
            '_ack_'}${randomNumber.toString()}`,
          ackFunction
        );
        // document.addEventListener("sending_ice_candidate_trickle"+"_ack_"+randomNumber.toString(), function(evnt) {
        //     var ack = JSON.parse(evnt.detail);
        //     // ack = ack+""; //TODO:remove this line
        //     media_channel.Debug.log("Trickle Ice candidate send Ack "+ack);
        //     msgCh.documentEventListeners.push(ack.transactionId);
        //     document.addEventListener(ack.transactionId, function(e) {
        //         try{
        //             // msgCh.removeListener("document",ack.transactionId,true); //no i18n
        //             // msgCh.removeListener("document","sending_ice_candidate_trickle"+"_ack_"+randomNumber.toString(),true); //no i18n
        //             var response = JSON.parse(e.detail);
        //
        //             var info = {"source":"FromMSToClient","response":response}; //no i18n
        //             var actionSegment = self.msgCh.createActionSegment("TRICKLE",3,new Date().getTime(),info); //no i18n
        //             var relationalIds=[];
        //             relationalIds.push(parseInt(roomId),parseInt(userId),connectionId,self.pluginId);
        //             var action = self.msgCh.createAction(actionSegment,relationalIds);
        //             self.msgCh.createModuleASAndSend(roomId,"TRICKLE",action); //no i18n
        //
        //             media_channel.Debug.log("Ice candidate trickle  event response",response);
        //         }catch(ex){
        //             // msgCh.removeListener("document",ack.transactionId,true); //no i18n
        //             // msgCh.removeListener("document","sending_ice_candidate_trickle"+"_ack_"+randomNumber.toString(),true); //no i18n
        //             self.Errors.onError.apply(self,this.msgCh.cs_proto.Errors.CREATE_CONNECTION);
        //         }
        //     });
        //     media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
        //         if(o.transactionId == ack.transactionId){
        //             var event = new CustomEvent(o.transactionId,{'detail':o.detail});  //no i18n
        //             document.dispatchEvent(event);
        //         }
        //     })
        // })

        // req.Events.onAck = function(ack){
        //     media_channel.Debug.log("Trickle Ice candidate send Ack "+ack);
        // };
        //
        // req.Events.onResponse = function(response){
        //     media_channel.Debug.log("Ice candidate trickle  event response",response);
        // };

        req.Events.onError = function(error) {
          media_channel.Debug.log('IIce candidate trickle  event', error);
          //TODO: what to do here ?
        };
      }
    },

    configure: function(jsep) {
      let { msgCh } = this.connection;
      if (
        jsep.type === 'offer' &&
        this.webrtcCORE.mySdp != null &&
        this.webrtcCORE.options != null
      ) {
        let { connectionId } = this.connection;
        let audioSend = this.webrtcCORE.options.audio === false ? false : true;
        let videoSend = this.webrtcCORE.options.video === false ? false : true;
        let bitrate = this.webrtcCORE.bitrate.value;
        //console.log("Configuring bitrate to "+bitrate + " bits per second");
        let mediaParams = {
          sessionId: connectionId,
          handleId: this.pluginId,
          eventParams: {
            jsep_offer: this.webrtcCORE.mySdp,
            audio: audioSend,
            video: videoSend,
            bitrate: bitrate
          }
        }; //no i18n
        let randomNumber = msgCh.generateRandomNumber('publishing_stream'); //no i18n
        let self = this;

        let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        let actionSegment = self.msgCh.createActionSegment(
          'PUBLISH_STREAM',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        let relationalIds = [];
        relationalIds.push(
          parseInt(roomId),
          parseInt(userId),
          connectionId,
          self.pluginId
        );
        let action = self.msgCh.createAction(actionSegment, relationalIds);
        self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        let req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.PUBLISH_STREAM,
          'publishing_stream',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
        let transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);

            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'PUBLISH_STREAM',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              parseInt(roomId),
              parseInt(userId),
              connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n
            self.Events.onPublish.apply(self, [response]);

            //                    if(!response["audio_codec"]){
            //                        //TODO: throw audio codec  mismatch Error and viewers won't be able to hear
            //                    }
            //                    if(!response["video_codec"]){
            //                        //TODO: throw video codec  mismatch Error and viewers won't be able to see
            //                    }
          } catch (e) {}
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `publishing_stream_ack_${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `publishing_stream_ack_${randomNumber.toString()}`,
          ackFunction
        );
        //                 document.addEventListener("publishing_stream_ack_"+randomNumber.toString(), function(evnt) {
        //                     self.removeListener("document","publishing_stream_ack_"+randomNumber.toString(),true); //no i18n
        //                     var ack = JSON.parse(evnt.detail);
        //                     msgCh.documentEventListeners.push(ack.transactionId);
        //                     document.addEventListener(ack.transactionId, function(e) {
        //                         try{
        //                             self.removeListener("document",ack.transactionId,true); //no i18n
        //                             var response = JSON.parse(e.detail);
        //
        //                             var info = {"source":"FromMSToClient","response":response}; //no i18n
        //                             var actionSegment = self.msgCh.createActionSegment("PUBLISH_STREAM",3,new Date().getTime(),info); //no i18n
        //                             var relationalIds=[];
        //                             relationalIds.push(parseInt(roomId),parseInt(userId),connectionId,self.pluginId);
        //                             var action = self.msgCh.createAction(actionSegment,relationalIds);
        //                             self.msgCh.createModuleASAndSend(roomId,"PUBLISH_STREAM",action); //no i18n
        //                             self.Events.onPublish.apply(self,[response]);
        //
        // //                    if(!response["audio_codec"]){
        // //                        //TODO: throw audio codec  mismatch Error and viewers won't be able to hear
        // //                    }
        // //                    if(!response["video_codec"]){
        // //                        //TODO: throw video codec  mismatch Error and viewers won't be able to see
        // //                    }
        //
        //                         }catch(e){
        //                             self.removeListener("document",ack.transactionId,true); //no i18n
        //                         }
        //                     });
        //                     media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
        //                         if(o.transactionId == ack.transactionId){
        //                             var event = new CustomEvent(o.transactionId,{'detail':o.detail});  //no i18n
        //                             document.dispatchEvent(event);
        //                         }
        //                     })
        //                 })

        req.Events.onError = function(error) {
          self.Errors.onError.apply(self, [
            msgCh.cs_proto.Errors.PUBLISH_STREAM_FAILED
          ]);
        };
      } else {
        this.Errors.onError.apply(this, [
          msgCh.cs_proto.Errors.PUBLISH_STREAM_FAILED
        ]);
      }
    },

    initAndAttachToMediaServer: function(stream, isScreenShare) {
      let { connectionId } = this.connection;
      let { msgCh } = this.connection;
      let eventParams = {};
      eventParams.pluginType = this.confInstance.plugin;
      if (isScreenShare) {
        eventParams.isScreenShare = true;
      }
      let mediaParams = { sessionId: connectionId, eventParams: eventParams }; //no i18n
      let randomNumber = msgCh.generateRandomNumber(
        'init_videoroom_plugin_publisher'
      ); //no i18n
      let self = this;

      let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
      let actionSegment = self.connection.msgCh.createActionSegment(
        'INIT_PLUGIN',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(parseInt(roomId), parseInt(userId), connectionId);
      let action = msgCh.createAction(actionSegment, relationalIds);
      msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

      let req = msgCh.sendReq(
        msgCh.cs_proto.MediaEvents.INIT_PLUGIN,
        'init_videoroom_plugin_publisher',
        msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n
      let transactionId;
      function respFunction(e) {
        document.removeEventListener(transactionId, respFunction);
        try {
          let response = JSON.parse(e.detail);

          let info = { source: 'FromMSToClient', response: response }; //no i18n
          let actionSegment = self.connection.msgCh.createActionSegment(
            'INIT_PLUGIN',
            3,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(parseInt(roomId), parseInt(userId), connectionId);
          let action = msgCh.createAction(actionSegment, relationalIds);
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n

          if (response.id) {
            self.pluginId = response.id;
            self.bindPluginToMediaServer(self.pluginId);
            self.join(stream, isScreenShare);
            if (self.source != 3) {
              self.confInstance.Events.onCreateVideoElement.apply(self, [self]);
            }
            // self.Events.onStreamCreated.apply(self,[stream]);
          } else {
            self.Errors.onError.apply(self, [
              msgCh.cs_proto.Errors.INIT_PLUGIN
            ]);
          }
        } catch (e) {
          self.Errors.onError.apply(self, [msgCh.cs_proto.Errors.INIT_PLUGIN]);
        }
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        msgCh.documentEventListeners.push(ack.transactionId);
        transactionId = ack.transactionId;
        document.removeEventListener(
          `init_videoroom_plugin_publisher_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }

      document.addEventListener(
        `init_videoroom_plugin_publisher_ack_${randomNumber.toString()}`,
        ackFunction
      );
      // document.addEventListener("init_videoroom_plugin_publisher_ack_"+randomNumber.toString(), function(evnt) {
      //     var ack = JSON.parse(evnt.detail);
      //     self.removeListener("document","init_videoroom_plugin_publisher_ack_"+randomNumber.toString(),true); //no i18n
      //     // ack = ack+""; //TODO:remove this line
      //     msgCh.documentEventListeners.push(ack.transactionId);
      //     document.addEventListener(ack.transactionId, function(e) {
      //         try{
      //             try{
      //                 self.removeListener("document",ack.transactionId,true); //no i18n
      //                 var response = JSON.parse(e.detail);
      //
      //                 var info = {"source":"FromMSToClient","response":response}; //no i18n
      //                 var actionSegment = self.connection.msgCh.createActionSegment("INIT_PLUGIN",3,new Date().getTime(),info); //no i18n
      //                 var relationalIds=[];
      //                 relationalIds.push(parseInt(roomId),parseInt(userId),connectionId);
      //                 var action = msgCh.createAction(actionSegment,relationalIds);
      //                 msgCh.createModuleASAndSend(roomId,"INIT_PLUGIN",action); //no i18n
      //
      //                 if(response.id){
      //                     self.pluginId = response.id;
      //                     self.bindPluginToMediaServer(self.pluginId);
      //                     self.join(stream,isScreenShare);
      //                     if(self.source!=3) {
      //                         self.confInstance.Events.onCreateVideoElement.apply(self, [self]);
      //                     }
      //                     // self.Events.onStreamCreated.apply(self,[stream]);
      //                 }else{
      //                     self.Errors.onError.apply(self,[msgCh.cs_proto.Errors.INIT_PLUGIN]);
      //                 }
      //             }catch(e){
      //                 self.removeListener("document",ack.transactionId,true); //no i18n
      //                 self.Errors.onError.apply(self,[msgCh.cs_proto.Errors.INIT_PLUGIN]);
      //             }
      //         }catch(ex){
      //             self.removeListener("document",ack.transactionId,true); //no i18n
      //         }
      //     });
      //     media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
      //         if(o.transactionId == ack.transactionId){
      //             var event = new CustomEvent(o.transactionId,{'detail':o.detail});  //no i18n
      //             document.dispatchEvent(event);
      //         }
      //     })
      // })

      req.Events.onError = function(error) {
        self.Errors.onError.apply(self, [msgCh.cs_proto.Errors.INIT_PLUGIN]);
      };
    },

    bindStreamToMediaServer: function() {
      let self = this;
      this.connection.msgCh.csConnection.addEventListener(
        self.streamId,
        e => {
          //Process Publisher Operations Message
          media_channel.Debug.logConnection(
            `received at stream ${self.streamId} data->${e.data}`
          ); //no i18n
          self.handleMessage(e.data);
        },
        false
      );
    },

    join: function(stream, isScreenShare) {
      let { msgCh } = this.connection;
      if (this.pluginId) {
        let { connectionId } = this.connection;
        let eventParams = {};
        eventParams.roomId = this.confInstance.roomId;
        if (isScreenShare) {
          eventParams.isScreenShare = true;
        }
        let mediaParams = {
          sessionId: connectionId,
          handleId: this.pluginId,
          eventParams: eventParams
        }; //no i18n
        let randomNumber = msgCh.generateRandomNumber(
          'map_room_to_plugin/join_a_room_in_plugin_for_publisher'
        ); //no i18n
        let self = this;

        let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        // info.response = response;
        let actionSegment = msgCh.createActionSegment(
          'MAP_ROOM_TO_PLUGIN',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        let relationalIds = [];
        relationalIds.push(
          parseInt(roomId),
          parseInt(userId),
          connectionId,
          self.pluginId
        );
        let action = msgCh.createAction(actionSegment, relationalIds);
        msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        let req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.MAP_ROOM_TO_PLUGIN,
          'map_room_to_plugin/join_a_room_in_plugin_for_publisher',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
        let transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);

            let info = { source: 'FromMSToClient', response: response }; //no i18n
            // info.response = response;
            let actionSegment = msgCh.createActionSegment(
              'MAP_ROOM_TO_PLUGIN',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              parseInt(roomId),
              parseInt(userId),
              connectionId,
              self.pluginId
            );
            let action = msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n

            if (response.id) {
              //Get Id from Response,Id is publisher uniqueId so this id will be used to identify publisher handles later
              self.id = response.id;
              self.streamId = response.id;
              self.bindStreamToMediaServer();
              self.Events.onInit.apply(self, [self]);
              // self.confInstance.subscriberHandles[self.id] = self;
              self.Events.onStreamCreated.apply(self, [
                { stream: stream, plugin: self }
              ]);
              self.confInstance.pubHandles[self.id] = self;
            } else {
              self.Errors.onError.apply(self, [
                msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED
              ]);
            }
          } catch (ex) {
            self.Errors.onError.apply(self, [
              msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED
            ]);
          }
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `map_room_to_plugin/join_a_room_in_plugin_for_publisher_ack_${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `map_room_to_plugin/join_a_room_in_plugin_for_publisher_ack_${randomNumber.toString()}`,
          ackFunction
        );

        // document.addEventListener("map_room_to_plugin/join_a_room_in_plugin_for_publisher_ack_"+randomNumber.toString(), function(evnt) {
        //     try{
        //         self.removeListener("document","map_room_to_plugin/join_a_room_in_plugin_for_publisher_ack_"+randomNumber.toString(),true); //no i18n
        //         var ack = JSON.parse(evnt.detail);
        //         msgCh.documentEventListeners.push(ack.transactionId);
        //         document.addEventListener(ack.transactionId, function(e) {
        //             try{
        //                 self.removeListener("document",ack.transactionId,true); //no i18n
        //                 var response = JSON.parse(e.detail);
        //
        //                 var info = {"source":"FromMSToClient","response":response}; //no i18n
        //                 // info.response = response;
        //                 var actionSegment = msgCh.createActionSegment("MAP_ROOM_TO_PLUGIN",3,new Date().getTime(),info); //no i18n
        //                 var relationalIds=[];
        //                 relationalIds.push(parseInt(roomId),parseInt(userId),connectionId,self.pluginId);
        //                 var action = msgCh.createAction(actionSegment,relationalIds);
        //                 msgCh.createModuleASAndSend(roomId,"MAP_ROOM_TO_PLUGIN",action); //no i18n
        //
        //
        //                 if(response.id){
        //                     //Get Id from Response,Id is publisher uniqueId so this id will be used to identify publisher handles later
        //                     self.id = response.id;
        //                     self.streamId = response.id;
        //                     self.Events.onInit.apply(self,[self]);
        //                     // self.confInstance.subscriberHandles[self.id] = self;
        //                     self.Events.onStreamCreated.apply(self,[{stream:stream,plugin:self}]);
        //                     self.confInstance.pubHandles[self.id] = self;
        //                 }else{
        //                     self.Errors.onError.apply(self,[msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED]);
        //                 }
        //             }catch(ex){
        //                 self.removeListener("document",ack.transactionId,true); //no i18n
        //                 self.Errors.onError.apply(self,[msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED]);
        //             }
        //         });
        //         media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
        //             if(o.transactionId == ack.transactionId){
        //                 var event = new CustomEvent(o.transactionId,{'detail':o.detail}); //no i18n
        //                 document.dispatchEvent(event);
        //             }
        //         })
        //     }catch(y){
        //         self.removeListener("document",ack.transactionId,true); //no i18n
        //         self.Errors.onError.apply(self,[msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED]);
        //     }
        // })

        req.Events.onError = function(error) {
          self.Errors.onError.apply(self, [
            msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED
          ]);
        };
      } else {
        this.Errors.onError.apply(this, [
          msgCh.cs_proto.Errors.NEED_TO_INIT_PLUGIN
        ]);
      }
    },

    publish: function() {
      let isPublisher = true;

      media_channel.handlePeerCreation(
        this,
        {
          video: true,
          audio: true,
          simulcast: this.webrtcCORE.options.simulcast,
          bitrate: this.webrtcCORE.bitrate.value
        },
        isPublisher,
        null
      ); //to enable simulcast
    },

    unpublish: function() {
      // if(this.webrtcCORE.webrtcUP = true && (this.iceState === "connected" || this.iceState ==="completed")){
      let { connectionId } = this.connection;
      let { msgCh } = this.connection;
      let mediaParams = { sessionId: connectionId, handleId: this.pluginId }; //no i18n
      let randomNumber = msgCh.generateRandomNumber('unpublishing_stream'); //no i18n
      let self = this;

      let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
      let actionSegment = self.connection.msgCh.createActionSegment(
        'UNPUBLISH_STREAM',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(
        parseInt(roomId),
        parseInt(userId),
        connectionId,
        self.pluginId
      );
      let action = self.connection.msgCh.createAction(
        actionSegment,
        relationalIds
      );
      self.connection.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

      let req = msgCh.sendReq(
        msgCh.cs_proto.MediaEvents.UNPUBLISH_STREAM,
        'unpublishing_stream',
        msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n
      let transactionId;
      function respFunction(e) {
        document.removeEventListener(transactionId, respFunction);
        try {
          var response = JSON.parse(e.detail);

          let info = { source: 'FromMSToClient', response: response }; //no i18n
          let actionSegment = self.connection.msgCh.createActionSegment(
            'UNPUBLISH_STREAM',
            3,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(roomId, userId, connectionId, self.pluginId);
          let action = self.connection.msgCh.createAction(
            actionSegment,
            relationalIds
          );
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          self.connection.msgCh.createModuleASAndSend(
            roomId,
            transactionId,
            action,
            key
          ); //no i18n

          if (response.unpublished === 'ok') {
            //Get Id from Response,Id is publisher uniqueId so this id will be used to identify publisher handles later
            self.liveStream = false;
            self.Events.onUnpublish.apply(self, [response]);
          } else {
            self.Errors.onError.apply(
              self,
              msgCh.cs_proto.Errors.UNPUBLISH_STREAM_FAILED
            );
          }
        } catch (e) {
          media_channel.Debug.log(
            `Error while processing unpublish stream event response ${response}`
          );
        }
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        msgCh.documentEventListeners.push(ack.transactionId);
        transactionId = ack.transactionId;
        document.removeEventListener(
          `unpublishing_stream_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `unpublishing_stream_ack_${randomNumber.toString()}`,
        ackFunction
      );
      // document.addEventListener("unpublishing_stream_ack_"+randomNumber.toString(), function(evnt) {
      //     self.removeListener("document","unpublishing_stream_ack_"+randomNumber.toString(),true); //no i18n
      //     var ack = JSON.parse(evnt.detail);
      //     msgCh.documentEventListeners.push(ack.transactionId);
      //     document.addEventListener(ack.transactionId, function(e) {
      //         try{
      //             self.removeListener("document",ack.transactionId,true); //no i18n
      //             var response = JSON.parse(e.detail);
      //
      //             var info = {"source":"FromMSToClient","response":response}; //no i18n
      //             var actionSegment = self.connection.msgCh.createActionSegment("UNPUBLISH_STREAM",3,new Date().getTime(),info); //no i18n
      //             var relationalIds=[];
      //             relationalIds.push(roomId,userId,connectionId,self.pluginId);
      //             var action = self.connection.msgCh.createAction(actionSegment,relationalIds);
      //             self.connection.msgCh.createModuleASAndSend(roomId,"UNPUBLISH_STREAM",action); //no i18n
      //
      //
      //             if(response.unpublished === "ok"){
      //                 //Get Id from Response,Id is publisher uniqueId so this id will be used to identify publisher handles later
      //                 self.liveStream = false;
      //                 self.Events.onUnpublish.apply(self,[response]);
      //             }else{
      //                 self.Errors.onError.apply(self,msgCh.cs_proto.Errors.UNPUBLISH_STREAM_FAILED);
      //             }
      //         }catch(e){
      //             self.removeListener("document",ack.transactionId,true); //no i18n
      //             media_channel.Debug.log("Error while processing unpublish stream event response "+response);
      //         }
      //     });
      //     media_channel.messages_without_ack.find(function(o){ //possibilty tht the response was received before the ack
      //         if(o.transactionId == ack.transactionId){
      //             var event = new CustomEvent(o.transactionId,{'detail':o.detail});  //no i18n
      //             document.dispatchEvent(event);
      //         }
      //     })
      // })

      req.Events.onError = function(error) {
        self.Errors.onError.apply(
          self,
          msgCh.cs_proto.Errors.UNPUBLISH_STREAM_FAILED
        );
      };

      return;
      // }
      // return false;
    }
  };

  win.z_subscriber = function(confInstance, stream, source) {
    this.init(confInstance, stream, source);
  };

  z_subscriber.prototype = {
    confInstance: undefined,

    connection: undefined,

    msgCh: undefined,

    id: undefined,

    userId: undefined,

    pluginId: undefined,

    stream: undefined,

    avOptions: undefined,

    source: 1, //cam/screenshare

    isStreamDestroyed: false,

    handleType: 2,

    detached: false,

    visibilityDetector: undefined,

    //Parameters added for simulcast /r
    layerChangeLoop: {},
    isPublisherSimulcasting: false,

    init: function(confInstance, stream, source) {
      this.confInstance = confInstance.conf;
      this.connection = confInstance.connection;
      this.msgCh = confInstance.connection.msgCh;
      this.stream = stream;
      this.userId = stream.display;
      this.streamId = stream.id;
      // this.bindWebrtcEvents();
      this.webrtcCORE = new z_webrtc();
      this.avOptions = new avOptions();
      // this.avOptions.audio = {};
      // this.avOptions.video = {};
      //     {
      //     options:null,
      //     isVideoDisabledByUser:false,
      //     isAudioDisabledByUser:false,
      //     remoteStream:null,
      //     mySdp:null,
      //     remoteSdp:null,
      //     mediaConstraints:null,
      //     candidates:[],
      //     pc:null,
      //     trickle:false, // trickle default FALSE, but can change this property by checking the browser
      //     iceDone:false,
      //     webrtcUP:false,
      //     volume:{
      //         value:null,
      //         timer:null
      //     },
      //     bitrate:{
      //         value:null,
      //         bsnow:null,
      //         bsbefore:null,
      //         tsnow:null,
      //         tsbefore:null,
      //         timer:null
      //     }
      //
      // };
      this.checkAndSetTrickleSupport();
      this.initAndAttachToMediaServer();
      this.source = source;

      //For simulcast, we are finding out the time at which subscriber is joined and check for no slow links loop is triggered /r
      this.webrtcCORE.timeStamp = new Date().getTime();
      media_channel.Debug.log(
        `New Subscriber joined at ${new Date(
          this.webrtcCORE.timeStamp
        ).toLocaleTimeString('en-US')}`
      );
    },

    checkAndSetTrickleSupport: function() {
      this.webrtcCORE.trickle = media_channel.trickleSupported;
    },

    iceState: undefined,

    jsep: undefined,

    webrtcEvents: {
      iceStateChanged: function(iceState) {},

      sdpOffer: function(error, jsep) {
        // Both creation and Error for Offer would be called on this method and Mostly would be user for Publisher
      },

      sdpAnswer: function(error, jsep) {
        // Both creation and Error for Answer would be called on this method and Mostly would be user for Subscriber
      },

      remoteStream: function(error, stream) {},

      sdpWithIce: function(sdp) {},

      trickleIceCandidate: function(candidate) {}
    },
    Events: {
      onInit: function(publisher) {},

      onStreamDestroyed: function() {},

      onStreamSubscribed: function() {},

      onStreamUnsubscribed: function() {},

      onAudioVideoPropertyChange: function(options) {},

      onPause: function() {},

      onStart: function() {},

      onFailure: function() {},

      onJoin: function() {},

      onTalking: function() {},

      onStoppedTalking: function() {},

      onNewOffer: function() {},
      onSignalingStateChange: function() {},
      onVideoPlayBackSuccess: function() {},
      onVideoPlayBackFailure: function() {},
      onVisibilityChange: function() {},
      onDetachedSuccessfully: function() {}
    },

    Errors: {
      onError: function(err) {}
    },

    removeVisibilityBinder: function(handle) {
      let hidden = 'hidden'; //no i18n
      // Standards:
      if (hidden in document) {
        document.removeEventListener(
          'visibilitychange',
          handle.visibilityDetector
        );
      } else if ((hidden = 'mozHidden') in document) {
        document.removeEventListener(
          'mozvisibilitychange',
          handle.visibilityDetector
        );
      } else if ((hidden = 'webkitHidden') in document) {
        document.removeEventListener(
          'webkitvisibilitychange',
          handle.visibilityDetector
        );
      } else if ((hidden = 'msHidden') in document) {
        document.removeEventListener(
          'msvisibilitychange',
          handle.visibilityDetector
        );
      }
    },

    bindVisibilty: function(handle) {
      let v = 'visible',
        h = 'hidden',
        evtMap = {
          //no i18n
          focus: v,
          focusin: v,
          pageshow: v,
          blur: h,
          focusout: h,
          pagehide: h
        };
      let visibilityFunction = function(evt) {
        let isHidden;
        evt = evt || window.event;
        if (evt.type in evtMap) {
          isHidden = evtMap[evt.type];
        } else {
          isHidden = this[hidden] ? 'hidden' : 'visible'; //no i18n
        }
        // if(!handle.confInstance.fullScreenInProgress){
        handle.Events.onVisibilityChange.apply(handle, [
          { handle: handle, state: isHidden }
        ]);
        // }else{
        //     // handle.confInstance.fullScreenInProgress = false;
        // }
      };
      handle.visibilityDetector = debounced(500, visibilityFunction);
      // handle.visibilityDetector = function(evt){
      //     var isHidden;
      //     evt = evt || window.event;
      //     if (evt.type in evtMap){
      //         isHidden = evtMap[evt.type];
      //     }else{
      //         isHidden = this[hidden] ? "hidden" : "visible";
      //     }
      //         // if(!handle.confInstance.fullScreenInProgress){
      //         handle.Events.onVisibilityChange.apply(handle,[{handle:handle,state:isHidden}]);
      //         // }else{
      //         //     // handle.confInstance.fullScreenInProgress = false;
      //         // }
      // }

      var hidden = 'hidden'; //no i18n
      // Standards:
      if (hidden in document) {
        document.addEventListener(
          'visibilitychange',
          handle.visibilityDetector
        );
      } else if ((hidden = 'mozHidden') in document) {
        document.addEventListener(
          'mozvisibilitychange',
          handle.visibilityDetector
        );
      } else if ((hidden = 'webkitHidden') in document) {
        document.addEventListener(
          'webkitvisibilitychange',
          handle.visibilityDetector
        );
      } else if ((hidden = 'msHidden') in document) {
        document.addEventListener(
          'msvisibilitychange',
          handle.visibilityDetector
        );
      }
      // IE 9 and lower:
      else if ('onfocusin' in document) {
        document.onfocusin = document.onfocusout = handle.visibilityDetector;
      }
      // All others:
      else {
        window.onpageshow = window.onpagehide = window.onfocus = window.onblur =
          handle.visibilityDetector;
      }
      //first time only
      if (document[hidden] !== undefined) {
        let state = document[hidden] ? 'hidden' : 'visible'; //no i18n
        //                if(state == "hidden"){
        // handle.Events.onVisibilityChange.apply(handle,[{handle:handle,state: state}]);
        //                }
      }
    },
    closeMyPeerConnection: function(handle) {
      if (handle) {
        let config = handle.webrtcCORE;
        if (config) {
          try {
            if (config.volume) {
              if (config.volume.local && config.volume.local.timer) {
                clearInterval(config.volume.local.timer);
              }
              if (config.volume.remote && config.volume.remote.timer) {
                clearInterval(config.volume.remote.timer);
              }
            }
            config.volume = {};
            if (config.bitrate.timer) {
              clearInterval(config.bitrate.timer);
            }
            config.bitrate.timer = null;
            config.bitrate.bsnow = null;
            config.bitrate.bsbefore = null;
            config.bitrate.tsnow = null;
            config.bitrate.tsbefore = null;
            config.bitrate.value = null;
            try {
              // Try a MediaStreamTrack.stop() for each track
              if (config.myStream !== null && config.myStream !== undefined) {
                let tracks = config.myStream.getTracks();
                for (let i in tracks) {
                  let mst = tracks[i];
                  if (mst !== null && mst !== undefined) {
                    mst.stop();
                  }
                }
              }
            } catch (e) {
              // Do nothing if this fails
            }
            config.streamExternal = false;
            config.myStream = null;
            // Close PeerConnection
            if (config.pc) {
              try {
                config.pc.close();
              } catch (e) {
                // Do nothing
              }
            }
            config.pc = null;
            config.candidates = null;
            config.mySdp = null;
            config.remoteSdp = null;
            config.iceDone = false;
            config.dataChannel = null;
            config.dtmfSender = null;

            //For Simulcast ,If the subscriber leaves the room, 'setTimeout property for checkForNoSlowLinks' has to be cleared out. /r
            if (this.layerChangeLoop) {
              media_channel.Debug.log('Subscriber connection closed');
              clearTimeout(this.layerChangeLoop);
            }
          } catch (Exception) {
            //todo
          }
        }
      }
    },

    removeListener: function(target, lisenterid, isDocument) {
      let self = this;
      //            setTimeout(function() {
      if (isDocument) {
        if (document.removeEventListener) {
          document.removeEventListener(lisenterid, () => {});
        } else if (document.detachEvent) {
          document.detachEvent(lisenterid, () => {});
        }
      }
      self.connection.msgCh.documentEventListeners.splice(
        self.connection.msgCh.documentEventListeners.indexOf(lisenterid)
      );
      //            },1000);
    },
    handleVisibilityChange: function(handle, state) {
      if (
        handle.webrtcCORE &&
        handle.webrtcCORE.remoteStream &&
        handle.webrtcCORE.remoteStream.getVideoTracks().length > 0
      ) {
        let { hasVideo } = handle.avOptions.video;
        let videoStatus = handle.avOptions.video.reason;
        if (videoStatus == 0 || videoStatus == 3) {
          let toggleSource = 'visibility'; //no i18n
          if (handle.source != 2) {
            handle.toggleVideo(null, null, toggleSource);
          }
        }
      }
    },
    toggleAudio: function(resolve, reject, toggleSource) {
      if (
        this.webrtcCORE &&
        this.webrtcCORE.remoteStream &&
        this.webrtcCORE.remoteStream.getAudioTracks().length > 0
      ) {
        // var audioStatus = this.webrtcCORE.options.audio;
        let audioStatus = this.avOptions.audio.hasAudio;
        let isAudioDisabledByUser = this.avOptions.audio.reason == 1;
        let self = this;
        if (isAudioDisabledByUser == false) {
          var { connectionId } = this.connection;
          let { msgCh } = this.connection;
          var { connectionId } = this.connection;
          let mediaParams = {
            sessionId: connectionId,
            handleId: this.pluginId,
            eventParams: {
              audio: !audioStatus,
              video: this.avOptions.video.hasVideo,
              streamId: this.streamId
            }
          }; //no i18n
          let randomNumber = msgCh.generateRandomNumber(
            'audio_property_stream'
          ); //no i18n

          let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'AUDIO_PROPERTY_CHANGE',
            1,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(roomId, userId, connectionId, self.pluginId);
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

          let req = msgCh.sendReq(
            msgCh.cs_proto.MediaEvents.AUDIO_PROPERTY_CHANGE,
            'audio_property_stream',
            msgCh.cs_proto.ExchangeEndPointTypes.USER,
            undefined,
            msgCh.cs_proto.EventPipeLines.MEDIA,
            mediaParams,
            randomNumber
          ); //no i18n
          let transactionId;
          function respFunction(e) {
            document.removeEventListener(transactionId, respFunction);
            try {
              let response = JSON.parse(e.detail);

              let info = { source: 'FromMSToClient', response: response }; //no i18n
              let actionSegment = self.msgCh.createActionSegment(
                'AUDIO_PROPERTY_CHANGE',
                3,
                new Date().getTime(),
                info
              ); //no i18n
              let relationalIds = [];
              relationalIds.push(roomId, userId, connectionId, self.pluginId);
              let action = self.msgCh.createAction(
                actionSegment,
                relationalIds
              );
              let key = {};
              key.type = 0;
              let keyPair = {};
              keyPair[randomNumber] = transactionId;
              key.keyPair = keyPair;
              self.msgCh.createModuleASAndSend(
                roomId,
                transactionId,
                action,
                key
              ); //no i18n
              // var video = self.webrtcCORE.options.video;
              // if(self.webrtcCORE.isVideoDisabledByPublisher){
              //     video = false;
              // }
              if (response.configured == 'ok') {
                // self.webrtcCORE.remoteStream.getAudioTracks()[0].enabled = !audioStatus;
                // self.webrtcCORE.isAudioDisabledByPublisher = false; //todo: change user to publisher
                // self.avOptions.audio.hasAudio = !audioStatus;
                // if(!audioStatus == false){
                //     self.avOptions.audio.reason = 2;
                // }else{
                //     self.avOptions.audio.reason = 0;
                // }
                let publisherVideoStance = response.publisherVideo;
                let publihserAudioStance = response.publisherAudio;
                let audioStance = response.audio;
                let videoStance = response.video;
                // if(publisherVideoStance == false || publisherVideoStance == "false"){
                //     self.webrtcCORE.isVideoDisabledByPublisher = true;
                // }else{
                //     self.webrtcCORE.isVideoDisabledByPublisher = false;
                // }
                // if(publihserAudioStance == false || publihserAudioStance == "false"){
                //     self.webrtcCORE.isAudioDisabledByPublisher = true;
                // }else{
                //     self.webrtcCORE.isAudioDisabledByPublisher = false;
                // }
                // self.webrtcCORE.options.video = !videoStatus;
                // self.webrtcCORE.options.video = videoStance;
                // if((publisherVideoStance == true || publisherVideoStance == "true") && (videoStance == true || videoStance == "true")){
                //     self.avOptions.video.hasVideo = true;
                //     self.avOptions.video.reason = 0;
                // }else{
                //     self.avOptions.video.hasVideo = false;
                //     if((publisherVideoStance == false || publisherVideoStance == "false")){
                //         self.avOptions.video.reason = 1;
                //     }else if(toggleSource == "user"){ //no i18n
                //         self.avOptions.video.reason = 2;
                //     }else if(toggleSource == "visibility"){ //no i18n
                //         self.avOptions.video.reason = 3;
                //     }
                // }
                self.webrtcCORE.options.audio = audioStance;
                if (
                  (publihserAudioStance == true ||
                    publihserAudioStance == 'true') &&
                  (audioStance == true || audioStance == 'true')
                ) {
                  self.avOptions.audio.hasAudio = true;
                  self.avOptions.audio.reason = 0;
                } else {
                  self.avOptions.audio.hasAudio = false;
                  if (
                    publihserAudioStance == false ||
                    publihserAudioStance == 'false'
                  ) {
                    self.avOptions.audio.reason = 1;
                  } else if (toggleSource == 'user') {
                    //no i18n
                    self.avOptions.audio.reason = 2;
                  } else if (toggleSource == 'visibility') {
                    //no i18n
                    self.avOptions.audio.reason = 3;
                  }
                }
                self.webrtcCORE.options.audio = audioStance;
                // self.webrtcCORE.remoteStream.getAudioTracks()[0].enabled = self.avOptions.audio.hasAudio;
                let options = {
                  audio: self.avOptions.audio.hasAudio,
                  video: self.avOptions.video.hasVideo,
                  pluginId: self.pluginId,
                  plugin: self
                };
                self.Events.onAudioVideoPropertyChange.apply(self, [options]);
                if (resolve) {
                  resolve();
                }
              }
            } catch (e) {
              if (reject) {
                reject();
              }
            }
          }
          function ackFunction(evnt) {
            let ack = JSON.parse(evnt.detail);
            msgCh.documentEventListeners.push(ack.transactionId);
            transactionId = ack.transactionId;
            document.removeEventListener(
              `audio_property_stream_ack_${randomNumber.toString()}`,
              ackFunction
            );
            document.addEventListener(transactionId, respFunction);
            media_channel.messages_without_ack.find(o => {
              //possibilty tht the response was received before the ack
              if (o.transactionId == ack.transactionId) {
                let event = new CustomEvent(o.transactionId, {
                  detail: o.detail
                }); //no i18n
                document.dispatchEvent(event);
              }
            });
          }
          document.addEventListener(
            `audio_property_stream_ack_${randomNumber.toString()}`,
            ackFunction
          );

          req.Events.onError = function(error) {
            self.Errors.onError.apply(self, [
              msgCh.cs_proto.Errors.PUBLISH_STREAM_FAILED
            ]);
          };
        } else if (isAudioDisabledByUser == true) {
          var error = 'The publisher isnt sending an audio track'; //no i18n
          var errObj = {};
          errObj.handle = self.pluginId;
          errObj.error = error;
          self.Errors.onError.apply(self, [errObj]);
          // window.alert("The publisher isnt sending an audio track"); //no i18n
        }
      } else {
        if (this.webrtcCORE.remoteStream.getAudioTracks().length == 0) {
          var error = 'The publisher isnt sending an audio track'; //no i18n
          var errObj = {};
          errObj.handle = this.pluginId;
          errObj.error = error;
          this.Errors.onError.apply(this, [errObj]);
        }
      }
    },

    toggleVideo: function(resolve, reject, toggleSource) {
      if (
        this.webrtcCORE &&
        this.webrtcCORE.remoteStream &&
        this.webrtcCORE.remoteStream.getVideoTracks().length > 0
      ) {
        // var videoStatus = this.webrtcCORE.options.video;
        let videoStatus = this.avOptions.video.hasVideo;
        let isVideoDisabledByUser = this.avOptions.video.reason == 1;
        // var isVideoDisabledByUser = this.webrtcCORE.isVideoDisabledByPublisher;
        var self = this;
        if (isVideoDisabledByUser == false) {
          let { connectionId } = this.connection;
          let { msgCh } = this.connection;
          let mediaParams = {
            sessionId: connectionId,
            handleId: this.pluginId,
            eventParams: {
              audio: this.webrtcCORE.options.audio,
              video: !videoStatus,
              streamId: this.streamId
            }
          }; //no i18n
          let randomNumber = msgCh.generateRandomNumber(
            'video_property_stream'
          ); //no i18n

          let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'VIDEO_PROPERTY_CHANGE',
            1,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(roomId, userId, connectionId, self.pluginId);
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

          let req = msgCh.sendReq(
            msgCh.cs_proto.MediaEvents.VIDEO_PROPERTY_CHANGE,
            'video_property_stream',
            msgCh.cs_proto.ExchangeEndPointTypes.USER,
            undefined,
            msgCh.cs_proto.EventPipeLines.MEDIA,
            mediaParams,
            randomNumber
          ); //no i18n
          var self = this;
          let transactionId;
          function respFunction(e) {
            document.removeEventListener(transactionId, respFunction);
            try {
              let response = JSON.parse(e.detail);

              let info = { source: 'FromMSToClient', response: response }; //no i18n
              let actionSegment = self.msgCh.createActionSegment(
                'VIDEO_PROPERTY_CHANGE',
                3,
                new Date().getTime(),
                info
              ); //no i18n
              let relationalIds = [];
              relationalIds.push(roomId, userId, connectionId, self.pluginId);
              let action = self.msgCh.createAction(
                actionSegment,
                relationalIds
              );
              let key = {};
              key.type = 0;
              let keyPair = {};
              keyPair[randomNumber] = transactionId;
              key.keyPair = keyPair;
              self.msgCh.createModuleASAndSend(
                roomId,
                transactionId,
                action,
                key
              ); //no i18n

              if (response.configured == 'ok') {
                let publisherVideoStance = response.publisherVideo;
                let publihserAudioStance = response.publisherAudio;
                let audioStance = response.audio;
                let videoStance = response.video;
                if (
                  publisherVideoStance == false ||
                  publisherVideoStance == 'false'
                ) {
                  self.webrtcCORE.isVideoDisabledByPublisher = true;
                } else {
                  self.webrtcCORE.isVideoDisabledByPublisher = false;
                }
                if (
                  publihserAudioStance == false ||
                  publihserAudioStance == 'false'
                ) {
                  self.webrtcCORE.isAudioDisabledByPublisher = true;
                } else {
                  self.webrtcCORE.isAudioDisabledByPublisher = false;
                }
                // self.webrtcCORE.options.video = !videoStatus;
                self.webrtcCORE.options.video = videoStance;
                if (
                  (publisherVideoStance == true ||
                    publisherVideoStance == 'true') &&
                  (videoStance == true || videoStance == 'true')
                ) {
                  self.avOptions.video.hasVideo = true;
                  self.avOptions.video.reason = 0;
                } else {
                  self.avOptions.video.hasVideo = false;
                  if (
                    publisherVideoStance == false ||
                    publisherVideoStance == 'false'
                  ) {
                    self.avOptions.video.reason = 1;
                  } else if (toggleSource == 'user') {
                    //no i18n
                    self.avOptions.video.reason = 2;
                  } else if (toggleSource == 'visibility') {
                    //no i18n
                    self.avOptions.video.reason = 3;
                  }
                }
                self.webrtcCORE.options.audio = audioStance;
                // if((publihserAudioStance == true || publihserAudioStance == "true") && (audioStance == true || audioStance == "true")){
                //     self.avOptions.audio.hasAudio = true;
                //     self.avOptions.audio.reason = 0;
                // }else{
                //     self.avOptions.audio.hasAudio = false;
                //     if((publihserAudioStance == false || publihserAudioStance == "false")){
                //         self.avOptions.audio.reason = 1;
                //     }else if(toggleSource == "user"){ //no i18n
                //         self.avOptions.audio.reason = 2;
                //     }else if(toggleSource == "visibility"){ //no i18n
                //         self.avOptions.audio.reason = 3;
                //     }
                // }
                // self.avOptions.video.hasVideo = !videoStatus;
                // if(!videoStatus == false){
                //     if(toggleSource == "user"){
                //         self.avOptions.video.reason = 2;
                //     }else if(toggleSource == "visibilty"){ //no i18n
                //         self.avOptions.video.reason = 3;
                //     }
                // }else{
                //     self.avOptions.video.reason = 0;
                // }
                // self.webrtcCORE.remoteStream.getVideoTracks()[0].enabled = !videoStatus;
                // self.webrtcCORE.remoteStream.getVideoTracks()[0].enabled = self.avOptions.video.hasVideo;
                // var audio = self.webrtcCORE.options.audio;
                // if(self.webrtcCORE.isAudioDisabledByPublisher){
                //     audio = false;
                // }
                let options = {
                  audio: self.avOptions.audio.hasAudio,
                  video: self.avOptions.video.hasVideo,
                  pluginId: self.pluginId,
                  plugin: self
                };
                self.Events.onAudioVideoPropertyChange.apply(self, [options]);
                if (resolve) {
                  resolve();
                }
              }
              //                                else{
              //                                    //todo:-video toggle failed
              //                                }
            } catch (err) {
              if (reject) {
                reject();
              }
              //                                console.log("errror",err)
            }
          }
          function ackFunction(evnt) {
            let ack = JSON.parse(evnt.detail);
            msgCh.documentEventListeners.push(ack.transactionId);
            transactionId = ack.transactionId;
            document.removeEventListener(
              `video_property_stream_ack_${randomNumber.toString()}`,
              ackFunction
            );
            document.addEventListener(transactionId, respFunction);
            media_channel.messages_without_ack.find(o => {
              //possibilty tht the response was received before the ack
              if (o.transactionId == ack.transactionId) {
                let event = new CustomEvent(o.transactionId, {
                  detail: o.detail
                }); //no i18n
                document.dispatchEvent(event);
              }
            });
          }
          document.addEventListener(
            `video_property_stream_ack_${randomNumber.toString()}`,
            ackFunction
          );

          req.Events.onError = function(error) {
            self.Errors.onError.apply(self, [
              msgCh.cs_proto.Errors.PUBLISH_STREAM_FAILED
            ]);
          };
        } else if (isVideoDisabledByUser == true) {
          var error = 'The publisher isnt sending a video track'; //no i18n
          var errObj = {};
          errObj.handle = self.pluginId;
          errObj.error = error;
          self.Errors.onError.apply(self, [errObj]);
          // window.alert("The publisher isnt sending a video track"); //no i18n
        }
      } else {
        if (this.webrtcCORE.remoteStream.getVideoTracks().length == 0) {
          var error = 'The publisher isnt sending an video track'; //no i18n
          var errObj = {};
          errObj.handle = this.pluginId;
          errObj.error = error;
          this.Errors.onError.apply(this, [errObj]);
        }
      }
    },

    detachHandle: function() {
      let allHandleIds = [];
      allHandleIds.push(this.pluginId);
      let { msgCh } = this.connection;
      let self = this;
      //no need to wait for response, since, this is subscriber;
      self.Events.onDetachedSuccessfully.apply(self, [{ plugin: self }]);
      med_ch.media_conference.Events.onStreamDestroyed.apply(self, [self]);
      self.detached = true;

      let mediaParams = {
        sessionId: this.connection.connectionId,
        eventParams: { allHandleIds: allHandleIds.toString() }
      }; //no i18n
      let randomNumber = msgCh.generateRandomNumber('detach_plugin'); //no i18n

      let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
      let actionSegment = self.msgCh.createActionSegment(
        'DETACH_PLUGIN',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(
        roomId,
        userId,
        this.connection.connectionId,
        self.pluginId
      );
      let action = self.msgCh.createAction(actionSegment, relationalIds);
      self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

      let req = msgCh.sendReq(
        msgCh.cs_proto.MediaEvents.DETACH_PLUGIN,
        'detach_plugin',
        msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n
      let transactionId;
      function respFunction(e) {
        document.removeEventListener(transactionId, respFunction);
        try {
          let response = JSON.parse(e.detail);

          let info = { source: 'FromMSToClient', response: response }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'DETACH_PLUGIN',
            3,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(
            roomId,
            userId,
            self.connection.connectionId,
            self.pluginId
          );
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          self.msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n
          self.Events.onDetachedSuccessfully.apply(self, [{ plugin: self }]);
          // self.webrtcCORE.myStream.getTracks().forEach(function (track) {
          //     track.stop();
          // });
          med_ch.media_conference.Events.onStreamDestroyed.apply(self, [self]);
          // self.closeMyPeerConnection();
          //console.log("response",response);
          self.msgCh.createModuleASAndSend(roomId, 'DETACH_PLUGIN', action); //no i18n
        } catch (err) {
          //                    console.log("err",err);
        }
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        msgCh.documentEventListeners.push(ack.transactionId);
        transactionId = ack.transactionId;
        document.removeEventListener(
          `detach_plugin_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `detach_plugin_ack_${randomNumber.toString()}`,
        ackFunction
      );

      req.Events.onError = function(error) {
        self.Errors.onError.apply(self, [
          msgCh.cs_proto.Errors.PUBLISH_STREAM_FAILED
        ]);
      };
    },

    bindWebrtcEvents: function(pluginId) {
      let self = this;
      self.connection.msgCh.documentEventListeners.push(
        `iceStateChanged_${pluginId}`
      );
      document.addEventListener(`iceStateChanged_${pluginId}`, event => {
        self.iceState = event.detail[0].iceState;
      });
      self.connection.msgCh.documentEventListeners.push(`sdpOffer_${pluginId}`);
      document.addEventListener(`sdpOffer_${pluginId}`, event => {
        //TODO:throw Warning
      });
      self.connection.msgCh.documentEventListeners.push(
        `sdpAnswer_${pluginId}`
      );
      document.addEventListener(`sdpAnswer_${pluginId}`, event => {
        if (event.detail[0].error) {
          //TODO: throw Unable to publish Error
          return;
        }
        let audio = true;
        let video = true;
        let webrtcoptions = self.webrtcCORE.options;
        if (webrtcoptions) {
          if (webrtcoptions.audio) {
            audio = webrtcoptions.audio;
          }
          if (webrtcoptions.video) {
            video = webrtcoptions.video;
          }
        }
        self.subscribe(event.detail[0], { audio: audio, video: video });
        //TODO:throw Warning
      });
      this.webrtcEvents.remoteJsepProcessed = function(error, responseObj) {
        //should not be triggered for subscriber
        //TODO:throw Warning
      };
      self.connection.msgCh.documentEventListeners.push(
        `sdpWithIce_${pluginId}`
      );
      document.addEventListener(`sdpWithIce_${pluginId}`, event => {
        let config = self.webrtcCORE;
        config.mySdp = {
          type: config.pc.localDescription.type, //no i18n
          sdp: config.pc.localDescription.sdp //no i18n
        };
        if (config.trickle === false) {
          config.mySdp.trickle = false;
        }
        config.sdpSent = true;
        //TODO:send SDP to server
      });
      self.connection.msgCh.documentEventListeners.push(
        `trickleIceCandidate_${pluginId}`
      );
      document.addEventListener(`trickleIceCandidate_${pluginId}`, event => {
        let candidate = event.detail[0];
        if (candidate.completed && candidate.completed === true) {
          media_channel.Debug.log('Sending Ice Completed Event subsrciber');
          self.sendTrickleCandidate(candidate);
        } else {
          media_channel.Debug.log('Sending Ice Candidate ');
          self.sendTrickleCandidate(candidate);
        }
      });
      self.connection.msgCh.documentEventListeners.push(
        `remoteStream_${pluginId}`
      );
      document.addEventListener(`remoteStream_${pluginId}`, event => {
        let remoteStream = event.detail[0];
        let webrtcoptions = self.webrtcCORE.options;
        let audioValue = true;
        let videoValue = true;
        if (webrtcoptions) {
          if (webrtcoptions.audio) {
            audioValue = webrtcoptions.audio;
          }
          if (webrtcoptions.video) {
            videoValue = webrtcoptions.video;
          }
        }
        if (remoteStream.getVideoTracks().length > 0) {
          remoteStream.getVideoTracks()[0].onmute = function(event) {
            // if(event.target.muted == true || event.target.muted == "true"){
            //     var options={
            //         video:!event.target.muted,
            //         pluginId:self.pluginId
            //     }
            //     self.webrtcCORE.isVideoDisabledByUser = !options.video;
            //     self.Events.onAudioVideoPropertyChange.apply(self,[options]);
            // }
          };
          remoteStream.getVideoTracks()[0].onunmute = function(event) {
            // if(event.target.muted == false || event.target.muted == "false"){
            //     var options= {
            //         video : !event.target.muted,
            //         pluginId:self.pluginId
            //     }
            //     self.webrtcCORE.isVideoDisabledByUser = !options.video;
            //     self.Events.onAudioVideoPropertyChange.apply(self,[options]);
            // }
          };
        }

        if (remoteStream.getAudioTracks().length > 0) {
          remoteStream.getAudioTracks()[0].onmute = function(event) {
            // if(event.target.muted == true || event.target.muted == "true"){
            //     var options = {
            //         audio : !event.target.muted,
            //         pluginId: self.pluginId
            //     }
            //     self.webrtcCORE.isAudioDisabledByUser = !options.audio;
            //     self.Events.onAudioVideoPropertyChange.apply(self,[options]);
            // }
          };
          remoteStream.getAudioTracks()[0].onunmute = function(event) {
            // if(event.target.muted == false || event.target.muted == "false"){
            //     var options = {
            //         audio : !event.target.muted,
            //         pluginId : self.pluginId
            //     }
            //     self.webrtcCORE.isAudioDisabledByUser = !options.audio;
            //     self.Events.onAudioVideoPropertyChange.apply(self,[options]);
            // }
          };
        }

        let eleme = document.getElementById(`sub-${self.pluginId}`);
        if (eleme) {
          media_channel.attachMediaStream(eleme, remoteStream, self);
        }
      });
    },

    /*// Loop to check for no slow links and increase the quality of the stream - simulcast /r
        checkForNoSlowLinks:function(interval){
            media_channel.Debug.log("Subscriber Checking for no slow links : " + interval);
            var time = new Date().getTime();
            media_channel.Debug.log("Time : " + new Date(time).toLocaleTimeString("en-US"));
            var self = this;

            self.layerChangeLoop = setTimeout(function(){
                self.switchToHigherLayer();
                interval=interval+60000;
                self.checkForNoSlowLinks(interval);
            },interval);
        },

        //Based on NACKS value, check if layer change is required for a time period loop - simulcast /r
        handleSlowLink:function(responseString){
            var self = this;
            try{
                var sender=self.pluginId;
                var nacks=responseString.nacks;
                self.webrtcCORE.nacksArray.push(nacks);
                var lastNackReceivedTime = new Date().getTime();
                self.webrtcCORE.lastNackReceivedTime = lastNackReceivedTime;
                var lastNackReceivedTimeString = new Date(lastNackReceivedTime).toLocaleTimeString("en-US"); //no i18n

                function getSum(total, num) {
                    return total + num;
                }

                var totalNacksValue = (self.webrtcCORE.nacksArray.length!=0)?(self.webrtcCORE.nacksArray.reduce(getSum))/self.webrtcCORE.nacksArray.length:0;
                media_channel.Debug.log("Subscriber Id: " + sender + " Current nacks count: " + nacks + " Average nacks count : " + totalNacksValue + " Nacks Array : " + self.webrtcCORE.nacksArray + "  Timestamp : " + lastNackReceivedTimeString);

                if(self.webrtcCORE.nacksArray.length!=0){
                    if((lastNackReceivedTime - self.webrtcCORE.timeStamp < 1200) && ((self.webrtcCORE.nacksArray.reduce(getSum)) >= 200)){ //Indication to client that there is a low bandwidth and hence video will be published in low quality
                        media_channel.Debug.log("Low bandwidth prevailing --> Video quality will get reduced...");
                    }
                }

                if(lastNackReceivedTime - self.webrtcCORE.timeStamp >= 6000){ // Delay is temperorily provided. May be removed in future...
                    self.webrtcCORE.timeStamp = new Date().getTime();
                    self.webrtcCORE.nacksArray = [];
                    self.layerChange(totalNacksValue);
                }
            }

            catch(e){
                //TODO: throw or at least log why handling of message fails
            }
        },

        //Layer change function for subscriber based on NACKS value - simulcast /r
        layerChange:function(totalNacksValue){
            var self=this;
            if(self.webrtcCORE.substream == 0 && self.webrtcCORE.temporal == 0){
                media_channel.Debug.log("Publisher already sending in minimum quality...");
            }
            else{
                if(totalNacksValue >= 10 && totalNacksValue < 60){
                    self.switchToLowerLayers(1);
                }
                else if(totalNacksValue >= 60 && totalNacksValue < 100){
                    self.switchToLowerLayers(2);
                }
                else if(totalNacksValue >= 100 && totalNacksValue < 200){
                    self.switchToLowerLayers(3);
                }
                else if(totalNacksValue >= 200){
                    self.switchToLowerLayers(4);
                }
                else {
                    media_channel.Debug.log("No Layer changes happened...");
                }
            }
        },

        //Based on the NACKS value, quality of the stream will get reduced - simulcast /r
        switchToLowerLayers:function(noOfLayers){
            var self=this;
            if(self.webrtcCORE.substream == 0 && self.webrtcCORE.temporal == 1){
                self.changeTemporalLayer(0);
            }
            else if(self.webrtcCORE.substream == 0 && self.webrtcCORE.temporal == 2){
                self.changeTemporalLayer(1);
            }
            else if(self.webrtcCORE.substream == 1 && self.webrtcCORE.temporal == 1){
                if(noOfLayers == 1){
                    self.changeSubstreamLayer(0);
                    self.changeTemporalLayer(2);
                }
                else{
                    self.changeSubstreamLayer(0);
                }
            }
            else if(self.webrtcCORE.substream == 1 && self.webrtcCORE.temporal == 2){
                if(noOfLayers == 1){
                    self.changeTemporalLayer(1);
                }
                else if(noOfLayers == 2){
                    self.changeSubstreamLayer(0);
                }
                else{
                    self.changeSubstreamLayer(0);
                    self.changeTemporalLayer(1);
                }
            }
            else if(self.webrtcCORE.substream == 2 && self.webrtcCORE.temporal == 1){
                if(noOfLayers == 1){
                    self.changeSubstreamLayer(1);
                    self.changeTemporalLayer(2);
                }
                else if(noOfLayers == 2){
                    self.changeSubstreamLayer(1);
                }
                else if(noOfLayers == 3){
                    self.changeSubstreamLayer(0);
                    self.changeTemporalLayer(2);
                }
                else{
                    self.changeSubstreamLayer(0);
                }
            }
            else if(self.webrtcCORE.substream == 2 && self.webrtcCORE.temporal == 2){
                if(noOfLayers == 1){
                    self.changeTemporalLayer(1);
                }
                else if(noOfLayers == 2){
                    self.changeSubstreamLayer(1);
                }
                else if(noOfLayers == 3){
                    self.changeSubstreamLayer(1);
                    self.changeTemporalLayer(1);
                }
                else{
                    self.changeSubstreamLayer(0);
                }
            }
        },

        //IF there is no slow link detectd for a time period, quality of the stream will get increased - simulcast /r
        switchToHigherLayer:function(){
            var self=this;
            media_channel.Debug.log("Inside switching to Higher Layer Function...");
            if(self.webrtcCORE.substream == 0 && self.webrtcCORE.temporal == 0){ // SL0 TL0  to SL0 TL1
                self.changeTemporalLayer(1);
            }
            else if(self.webrtcCORE.substream == 0 && self.webrtcCORE.temporal == 1){ // SL0 TL1  to SL0 TL2
                self.changeTemporalLayer(2);
            }
            else if(self.webrtcCORE.substream == 0 && self.webrtcCORE.temporal == 2){ // SL0 TL2  to SL1 TL1
                self.changeSubstreamLayer(1);
                self.changeTemporalLayer(1);
            }
            else if(self.webrtcCORE.substream == 1 && self.webrtcCORE.temporal == 1){ // SL1 TL1  to SL1 TL2
                self.changeTemporalLayer(2);
            }
            else if(self.webrtcCORE.substream == 1 && self.webrtcCORE.temporal == 2){ // SL1 TL2  to SL2 TL1
                self.changeSubstreamLayer(2);
                self.changeTemporalLayer(1);
            }
            else if(self.webrtcCORE.substream == 2 && self.webrtcCORE.temporal == 1){ // SL2 TL1  to SL2 TL2
                self.changeTemporalLayer(2);
            }
            else if(self.webrtcCORE.substream == 2 && self.webrtcCORE.temporal == 2){ // Max. quality.
                media_channel.Debug.log("Publisher already sending in maximum quality...");
            }
            else{
                media_channel.Debug.log("Error : Janus has somewhere switched to TL 0 layer implicitly....");
            }
        },*/

    //Layer change function communication with the messaging server - simulcast /r
    changeSubstreamLayer: function(substreamValue) {
      let substream = substreamValue;
      let { connectionId } = this.connection;
      let { msgCh } = this.connection;
      let mediaParams = {
        sessionId: connectionId,
        handleId: this.pluginId,
        eventParams: { substream: substream }
      }; //no i18n
      let randomNumber = msgCh.generateRandomNumber('substream_change'); //no i18n

      let self = this;

      let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
      let actionSegment = self.msgCh.createActionSegment(
        'SUBSTREAM_CHANGE',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(
        parseInt(roomId),
        parseInt(userId),
        this.connection.connectionId,
        self.pluginId
      );
      let action = self.msgCh.createAction(actionSegment, relationalIds);
      self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

      let req = msgCh.sendReq(
        msgCh.cs_proto.MediaEvents.SUBSTREAM_CHANGE,
        'substream_change',
        msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n

      let transactionId;
      function respFunction(e) {
        document.removeEventListener(transactionId, respFunction);
        try {
          let response = JSON.parse(e.detail);
          if (response.configured == 'ok') {
            let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'SUBSTREAM_CHANGE',
              1,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              parseInt(roomId),
              parseInt(userId),
              self.connection.connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n

            self.webrtcCORE.nacksArray = [];
            let date = new Date().getTime();
            media_channel.Debug.high(
              `Acknowledgement for change of substream to : ${substream} Time : ${new Date(
                date
              ).toLocaleTimeString()} in milliseconds --> ${date} plugin id --> ${
                self.pluginId
              } stream id --> ${self.streamId}`
            ); //no i18n
          }
        } catch (error) {}
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        msgCh.documentEventListeners.push(ack.transactionId);
        transactionId = ack.transactionId;
        document.removeEventListener(
          `substream_change_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `substream_change_ack_${randomNumber.toString()}`,
        ackFunction
      );
    },

    //Layer change function communication with the messaging server - simulcast /r
    changeTemporalLayer: function(temporalValue) {
      let temporal = temporalValue;
      let { connectionId } = this.connection;
      let { msgCh } = this.connection;
      let mediaParams = {
        sessionId: connectionId,
        handleId: this.pluginId,
        eventParams: { temporal: temporal }
      }; //no i18n
      let randomNumber = msgCh.generateRandomNumber('temporal_change'); //no i18n

      let self = this;

      let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
      let actionSegment = self.msgCh.createActionSegment(
        'TEMPORAL_LAYER_CHANGE',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(
        parseInt(roomId),
        parseInt(userId),
        this.connection.connectionId,
        self.pluginId
      );
      let action = self.msgCh.createAction(actionSegment, relationalIds);
      self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

      let req = msgCh.sendReq(
        msgCh.cs_proto.MediaEvents.TEMPORAL_LAYER_CHANGE,
        'temporal_change',
        msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n
      let transactionId;
      function respFunction(e) {
        document.removeEventListener(transactionId, respFunction);
        try {
          let response = JSON.parse(e.detail);

          let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'TEMPORAL_LAYER_CHANGE',
            1,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(
            parseInt(roomId),
            parseInt(userId),
            self.connection.connectionId,
            self.pluginId
          );
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          self.msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n

          if (response.configured == 'ok') {
            self.webrtcCORE.nacksArray = [];
            let date = new Date().getTime();
            media_channel.Debug.high(
              `Acknowledgement for change of temporal layer to : ${temporal} Time : ${new Date(
                date
              ).toLocaleTimeString()} in milliseconds --> ${date} plugin id --> ${
                self.pluginId
              } stream id --> ${self.streamId}`
            ); //no i18n
          }
        } catch (error) {}
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        msgCh.documentEventListeners.push(ack.transactionId);
        transactionId = ack.transactionId;
        document.removeEventListener(
          `temporal_change_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `temporal_change_ack_${randomNumber.toString()}`,
        ackFunction
      );
    },

    increaseSubstreamLayer: function(substream) {
      let self = this;
      if (self.layerChangeLoop) {
        clearTimeout(self.layerChangeLoop);
        //console.log("Current layerchange loop timer has been cleared and restarted");
      }
      self.layerChangeLoop = setTimeout(() => {
        if (substream > 0 && substream < 3) {
          //console.log("Current Substream Layer --> ", self.webrtcCORE.substream);
          self.changeSubstreamLayer(substream);
          //console.log("Trying to stream at substream layer : ",substream);
        }
      }, 180000);
    },

    handleMessage: function(data) {
      var self = this;
      let config = this.webrtcCORE;
      try {
        let responseEvent = JSON.parse(data);
        if (responseEvent.status == 'RELAY') {
          //since the events would only be relayed
          if (responseEvent.mediaEvent.webrtcEvent) {
            if (responseEvent.mediaEvent.webrtcEvent.event == 'WEBRTC_UP') {
              self.webrtcCORE.webrtcUP = true;
              // self.Events.onStreamSubscribed.apply(self,[self]);

              var responseString = JSON.parse(responseEvent.responseString);

              if (responseString.ZMediaServer == 'webrtcup') {
                //self.Events.onWebrtcup.apply(self,[self]);
                //self.webrtcCORE.webrtcUP = true;
                self.changeSubstreamLayer(1);
                self.increaseSubstreamLayer(2); //manually triggering increase substream layer function for the first time alone
              }

              //If slowlink is detected, handle slow link function is called - simulcast /r
              if (responseString.ZMediaServer == 'slowlink') {
                if (self.isPublisherSimulcasting === true) {
                  //self.handleSlowLink(responseString);
                }
              }
            } else if (
              responseEvent.mediaEvent.webrtcEvent.event == 'SDP_OFFER'
            ) {
              //no i18n
              //set it as remote desc and create Answer
              if (responseEvent.responseString) {
                try {
                  let isPublisher = false;
                  media_channel.handlePeerCreation(
                    self,
                    {},
                    isPublisher,
                    responseEvent
                  );
                } catch (e) {
                  e = `${e}`; //TODO: remove this line
                  //TODO: throw 'Error while Setting Remote Description' and Error on subscribing
                }
              }
            }
            //              else if(responseEvent.mediaEvent.webrtcEvent.event == "SDP_ANSWER"){ //This event should not be called for subscriber   //no i18n
            //                    //TODO: throw Warning for this event
            //                }
            else if (responseEvent.mediaEvent.webrtcEvent.event == 'HANG_UP') {
              //no i18n
              self.Errors.onError.apply(
                self,
                self.connection.msgCh.cs_proto.Errors.CONNECTION_CLOSED
              ); //TODO: this event should be an error or destroyed event ?
            } else if (
              responseEvent.mediaEvent.webrtcEvent.event == 'TRICKLE'
            ) {
              //no i18n
              //ideally, this message should not be received as janus will send the ice candidates along with sdp
              // We got a trickle candidate from Janus
              var response = JSON.parse(responseEvent.responseString);
              let { candidate } = response;
              if (config.pc && config.remoteSdp) {
                // Add candidate right now
                media_channel.Debug.debug(
                  'Adding remote candidate:',
                  candidate
                ); //no i18n
                if (!candidate || candidate.completed === true) {
                  // end-of-candidates
                  config.pc.addIceCandidate();
                } else {
                  // New candidate
                  config.pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
              } else {
                // We didn't do setRemoteDescription (trickle got here before the offer?)
                media_channel.Debug.debug(
                  `We didn't do setRemoteDescription (trickle got here before the offer?), caching candidate = ${candidate}`
                );
                if (!config.candidates) {
                  config.candidates = [];
                }
                config.candidates.push(candidate);
              }
            } else if (
              responseEvent.mediaEvent.webrtcEvent.event == 'TALKING'
            ) {
              //no i18n
              var response = JSON.parse(responseEvent.responseString);
              self.Events.onTalking.apply(self, [response]);
            } else if (
              responseEvent.mediaEvent.webrtcEvent.event == 'STOPPED_TALKING'
            ) {
              //no i18n
              var response = JSON.parse(responseEvent.responseString);
              // self.Events.onStoppedTalking.apply(self,[response]);
            }
          } else if (responseEvent.mediaEvent.taskEvent) {
            //message received both when subscriber and/or publisher toggle.
            //howeer, when susscriber does it, message received will be overwritten at the response handling.
            if (
              responseEvent.mediaEvent.taskEvent.event ==
              'AUDIO_PROPERTY_CHANGE'
            ) {
              var responseString = JSON.parse(responseEvent.responseString);
              let { audio } = responseString;
              let optionsAudio = self.webrtcCORE.options.audio;
              let publisherAudioStance = responseString.publisherAudio;
              if (
                publisherAudioStance == true ||
                publisherAudioStance == 'true'
              ) {
                if (optionsAudio == false || optionsAudio == 'false') {
                  self.avOptions.audio.hasAudio = false;
                  self.avOptions.audio.reason = 2;
                } else if (optionsAudio == true || optionsAudio == 'true') {
                  self.avOptions.audio.hasAudio = true;
                  self.avOptions.audio.reason = 0;
                }
              } else {
                self.avOptions.audio.hasAudio = false;
                self.avOptions.audio.reason = 1;
              }
              // if(audio=="true"||audio==true){
              //     self.webrtcCORE.isAudioDisabledByPublisher = false;
              //     self.avOptions.audio.hasAudio = true;
              //     self.avOptions.audio.reason = 0;
              // }else{
              //     self.webrtcCORE.isAudioDisabledByPublisher = true;
              //     self.avOptions.audio.hasAudio = false;
              //     self.avOptions.audio.reason = 1;
              // }
              var options = {
                audio: self.avOptions.audio.hasAudio,
                pluginId: self.pluginId,
                plugin: self
              };
              self.Events.onAudioVideoPropertyChange.apply(self, [options]);
            } else if (
              responseEvent.mediaEvent.taskEvent.event ==
              'VIDEO_PROPERTY_CHANGE'
            ) {
              //no i18n
              var responseString = JSON.parse(responseEvent.responseString);
              let { video } = responseString;
              let optionsVideo = self.webrtcCORE.options.video;
              let publisherVideoStance = responseString.publisherVideo;
              if (
                publisherVideoStance == true ||
                publisherVideoStance == 'true'
              ) {
                if (optionsVideo == false || optionsVideo == 'false') {
                  self.avOptions.video.hasVideo = false;
                  self.avOptions.video.reason = 2;
                } else if (optionsVideo == true || optionsVideo == 'true') {
                  self.avOptions.video.hasVideo = true;
                  self.avOptions.video.reason = 0;
                }
              } else {
                self.avOptions.video.hasVideo = false;
                self.avOptions.video.reason = 1;
              }
              // if(video=="true"||video==true){
              //     self.webrtcCORE.isVideoDisabledByPublisher = false;
              //     self.avOptions.video.hasVideo = true;
              //     self.avOptions.video.reason = 0;
              // }else{
              //     self.webrtcCORE.isVideoDisabledByPublisher = true;
              //     self.avOptions.video.hasVideo = false;
              //     self.avOptions.video.reason = 1;
              // }
              var options = {
                video: self.avOptions.video.hasVideo,
                pluginId: self.pluginId,
                plugin: self
              };
              self.Events.onAudioVideoPropertyChange.apply(self, [options]);
            }
            //Catching the response for Substream change function from Janus - simulcast /r
            else if (
              responseEvent.mediaEvent.taskEvent.event == 'SUBSTREAM_CHANGE'
            ) {
              if (self.isPublisherSimulcasting === false) {
                self.isPublisherSimulcasting = true;
                //self.changeSubstreamLayer(0);
                //self.changeTemporalLayer(2);
                //var interval=120000;
                //self.checkForNoSlowLinks(interval);
              }
              var responseString = JSON.parse(responseEvent.responseString);
              self.webrtcCORE.substream = responseString.substream;

              //self.webrtcCORE.nacksArray = [];
              var date = new Date().getTime();
              media_channel.Debug.high(
                `RELAY Response from Janus for Substream change : ${
                  responseString.substream
                } Time : ${new Date(
                  date
                ).toLocaleTimeString()} in milliseconds --> ${date} plugin id --> ${
                  self.pluginId
                } stream id --> ${self.streamId}`
              ); //no i18n

              self.increaseSubstreamLayer(responseString.substream + 1);

              //var substream = responseString.substream;
              /*if(self.webrtcCORE.substream != substream){
                                media_channel.Debug.log("Actual Substream Change expected : " + self.webrtcCORE.substream + " But janus unable to switch to higher substream. Now current substream is : " + substream);
                                self.webrtcCORE.substream = substream;
                                self.changeTemporalLayer(2);
                            }*/
            }

            //Catching the response for Temporal layer change function from Janus - simulcast /r
            else if (
              responseEvent.mediaEvent.taskEvent.event ==
              'TEMPORAL_LAYER_CHANGE'
            ) {
              if (self.isPublisherSimulcasting === false) {
                self.isPublisherSimulcasting = true;
                //self.changeSubstreamLayer(0);
                //self.changeTemporalLayer(2);
                let interval = 120000;
                //self.checkForNoSlowLinks(interval);
              }
              var responseString = JSON.parse(responseEvent.responseString);
              self.webrtcCORE.temporal = responseString.temporal;
              //self.webrtcCORE.nacksArray = [];
              var date = new Date().getTime();
              media_channel.Debug.high(
                `RELAY Response from Janus for Temporal Layer change : ${
                  responseString.temporal
                } Time : ${new Date(
                  date
                ).toLocaleTimeString()} in milliseconds --> ${date} plugin id --> ${
                  self.pluginId
                } stream id --> ${self.streamId}`
              ); //no i18n
            } else if (
              responseEvent.mediaEvent.taskEvent.event ==
              'GOT_STREAM_FROM_CLIENT'
            ) {
              //no i18n
              var responseString = JSON.parse(responseEvent.responseString);
              let { type } = responseString;
              let { receiving } = responseString;
              if (type == 'video') {
                self.webrtcCORE.isVideoDisabledByPublisher = !receiving;
                // self.avOptions.video.hasVideo = receiving;
                let userVideoStance = self.avOptions.video.hasVideo;
                let userVideoStanceReason = self.avOptions.video.reason;
                if (
                  (receiving == true || receiving == 'true') &&
                  userVideoStanceReason != 2
                ) {
                  self.avOptions.video.hasVideo = true;
                  self.avOptions.video.reason = 0;
                } else {
                  self.avOptions.video.hasVideo = false;
                  self.avOptions.video.reason = 1;
                }
                var options = {
                  audio: self.avOptions.audio.hasAudio,
                  video: self.avOptions.video.hasVideo,
                  pluginId: self.pluginId,
                  plugin: self
                };
                self.Events.onAudioVideoPropertyChange.apply(self, [options]);
              } else if (type == 'audio') {
                //no i18n
                self.webrtcCORE.isAudioDisabledByPublisher = !receiving;
                let userAudioStance = self.avOptions.video.hasAudio;
                let userAudioStanceReason = self.avOptions.audio.reason;
                // self.avOptions.audio.hasAudio = receiving;
                if (
                  (receiving == true || receiving == 'true') &&
                  userAudioStanceReason != 2
                ) {
                  self.avOptions.audio.reason = 0;
                  self.avOptions.audio.hasAudio = true;
                } else {
                  self.avOptions.audio.reason = 1;
                  self.avOptions.audio.hasAudio = false;
                }
                var options = {
                  audio: self.avOptions.audio.hasAudio,
                  video: self.avOptions.video.hasVideo,
                  pluginId: self.pluginId,
                  plugin: self
                };
                self.Events.onAudioVideoPropertyChange.apply(self, [options]);
              }
            } else if (
              responseEvent.mediaEvent.taskEvent.event ==
              'NO_STREAM_FROM_CLIENT'
            ) {
              //no i18n
              var responseString = JSON.parse(responseEvent.responseString);
            } else if (
              responseEvent.mediaEvent.taskEvent.event == 'PUBLISHER_LEFT'
            ) {
              //no i18n
              //these messages are now sent to streamId bound by its own subscriber
              let stream = JSON.parse(responseEvent.responseString);
              var self = this;
              media_channel.allHandles.find(obj => {
                if (obj.streamId == stream.streamId) {
                  // obj.closeMyPeerConnection();
                  if (!obj.detached) {
                    obj.detachHandle();
                  }
                }
              });
            }
          }
        }
      } catch (error) {
        //                console.log("error",error);
      }
    },

    bindPluginToMediaServer: function(_pluginId) {
      let self = this;
      this.connection.msgCh.csConnection.addEventListener(
        _pluginId,
        e => {
          //Process Publisher Operations Message
          media_channel.Debug.logConnection(
            `received at plugin ${_pluginId} data->${e.data}`
          ); //no i18n
          self.handleMessage(e.data);
        },
        false
      );
    },

    bindStreamToMediaServer: function() {
      if (this.stream) {
        let self = this;
        this.connection.msgCh.csConnection.addEventListener(
          self.streamId,
          e => {
            //Process Publisher Operations Message
            media_channel.Debug.logConnection(
              `received at stream ${self.streamId} data->${e.data}`
            ); //no i18n
            self.handleMessage(e.data);
          },
          false
        );
      }
    },

    sendTrickleCandidate: function(candidate) {
      let self = this;
      let { connectionId } = this.connection;
      let { msgCh } = this.connection;
      if (candidate.completed && candidate.completed === true) {
        try {
          var mediaParams = {
            sessionId: connectionId,
            handleId: this.pluginId
          }; //no i18n
          var randomNumber = msgCh.generateRandomNumber(
            'sending_trickle_completed_event'
          ); //no i18n

          var info = { source: 'FromMSToClient', mediaParams: mediaParams }; //no i18n
          var actionSegment = self.msgCh.createActionSegment(
            'TRICKLE_COMPLETED',
            1,
            new Date().getTime(),
            info
          ); //no i18n
          var relationalIds = [];
          relationalIds.push(
            roomId,
            userId,
            self.connection.connectionId,
            self.pluginId
          );
          var action = self.msgCh.createAction(actionSegment, relationalIds);
          self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

          var req = msgCh.sendReq(
            msgCh.cs_proto.MediaEvents.TRICKLE_COMPLETED,
            'sending_trickle_completed_event',
            msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
            undefined,
            msgCh.cs_proto.EventPipeLines.MEDIA,
            mediaParams,
            randomNumber
          ); //no i18n
          var transactionId;
          function respFunction(e) {
            document.removeEventListener(transactionId, respFunction);
            try {
              let response = JSON.parse(e.detail);

              let info = { source: 'FromMSToClient', response: response }; //no i18n
              let actionSegment = self.msgCh.createActionSegment(
                'TRICKLE_COMPLETED',
                3,
                new Date().getTime(),
                info
              ); //no i18n
              let relationalIds = [];
              relationalIds.push(
                roomId,
                userId,
                self.connection.connectionId,
                self.pluginId
              );
              let action = self.msgCh.createAction(
                actionSegment,
                relationalIds
              );
              let key = {};
              key.type = 0;
              let keyPair = {};
              keyPair[randomNumber] = transactionId;
              key.keyPair = keyPair;
              self.msgCh.createModuleASAndSend(
                roomId,
                transactionId,
                action,
                key
              ); //no i18n

              media_channel.Debug.log('Ice completed event response', response);
            } catch (ex) {
              self.Errors.onError.apply(
                self,
                self.msgCh.cs_proto.Errors.INIT_PLUGIN
              );
            }
          }
          function ackFunction(evnt) {
            let ack = JSON.parse(evnt.detail);
            media_channel.Debug.log(`Trickle Ice completed Ack ${ack}`);
            msgCh.documentEventListeners.push(ack.transactionId);
            transactionId = ack.transacationId;
            document.removeEventListener(
              `sending_trickle_completed_event_ack_${randomNumber.toString()}`,
              ackFunction
            );
            document.addEventListener(transactionId, respFunction);
            media_channel.messages_without_ack.find(o => {
              //possibilty tht the response was received before the ack
              if (o.transactionId == ack.transactionId) {
                let event = new CustomEvent(o.transactionId, {
                  detail: o.detail
                }); //no i18n
                document.dispatchEvent(event);
              }
            });
          }
          document.addEventListener(
            `sending_trickle_completed_event_ack_${randomNumber.toString()}`,
            ackFunction
          );
        } catch (exception) {
          //                    console.log("exception",exception);
        }
        // req.Events.onAck = function(ack){
        //     media_channel.Debug.log("Trickle Ice completed Ack "+ack);
        // };
        //
        // req.Events.onResponse = function(response){
        //     media_channel.Debug.log("Ice completed event response",response);
        // };

        // self.Events.onError = function(error){
        //     media_channel.Debug.log("Ice completed event Error",error);
        // }
      } else if (candidate.candidate) {
        var mediaParams = {
          sessionId: connectionId,
          handleId: this.pluginId,
          eventParams: candidate
        }; //no i18n
        var randomNumber = msgCh.generateRandomNumber(
          'sending_ice_candidate_trickle'
        ); //no i18n

        var info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        var actionSegment = self.msgCh.createActionSegment(
          'TRICKLE',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        var relationalIds = [];
        relationalIds.push(
          roomId,
          userId,
          self.connection.connectionId,
          self.pluginId
        );
        var action = self.msgCh.createAction(actionSegment, relationalIds);
        self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        var req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.TRICKLE,
          'sending_ice_candidate_trickle',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
        var transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);

            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'TRICKLE',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              roomId,
              userId,
              self.connection.connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n

            media_channel.Debug.log(
              'Ice candidate trickle  event response',
              response
            );
          } catch (ex) {
            self.Errors.onError.apply(
              self,
              this.msgCh.cs_proto.Errors.CREATE_CONNECTION
            );
          }
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          // ack = ack+""; //TODO:remove this line
          media_channel.Debug.log(`Trickle Ice candidate send Ack ${ack}`);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `${'sending_ice_candidate_trickle' +
              '_ack_'}${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `${'sending_ice_candidate_trickle' +
            '_ack_'}${randomNumber.toString()}`,
          ackFunction
        );

        req.Events.onError = function(error) {
          media_channel.Debug.log('IIce candidate trickle  event', error);
          //TODO: what to do here ?
        };
      }
    },

    startSubscribing: function(jsep) {
      let { msgCh } = this.connection;
      if (
        jsep.type === 'answer' &&
        this.webrtcCORE.mySdp != null &&
        this.stream != null
      ) {
        let { connectionId } = this.connection;
        let audioReceive = true;
        let videoReceive = true;
        if (this.webrtcCORE.options) {
          audioReceive = this.webrtcCORE.options.audio === false ? false : true;
          videoReceive = this.webrtcCORE.options.video === false ? false : true;
        }
        let mediaParams = {
          sessionId: connectionId,
          handleId: this.pluginId,
          eventParams: {
            jsep_answer: this.webrtcCORE.mySdp,
            audio: audioReceive,
            video: videoReceive
          }
        }; //no i18n
        let randomNumber = msgCh.generateRandomNumber('subscribing_stream'); //no i18n
        let self = this;

        let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        let actionSegment = self.msgCh.createActionSegment(
          'SUBSCRIBE_TO_STREAM',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        let relationalIds = [];
        relationalIds.push(
          roomId,
          userId,
          self.connection.connectionId,
          self.pluginId
        );
        let action = self.msgCh.createAction(actionSegment, relationalIds);
        self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

        let req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.SUBSCRIBE_TO_STREAM,
          'subscribing_stream',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomNumber
        ); //no i18n
        let transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);

            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'SUBSCRIBE_TO_STREAM',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              roomId,
              userId,
              self.connection.connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomNumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n

            if (response.started === 'ok') {
              self.webrtcCORE.isAudioDisabledByPublisher = !response.publisherAudio;
              self.avOptions.audio.hasAudio = response.publisherAudio;
              if (
                response.publisherAudio == true ||
                response.publisherAudio == 'true'
              ) {
                self.avOptions.audio.reason = 0;
              } else {
                self.avOptions.audio.reason = 1;
              }
              self.webrtcCORE.isVideoDisabledByPublisher = !response.publisherVideo;
              self.avOptions.video.hasVideo = response.publisherVideo;
              if (
                response.publisherVideo == true ||
                response.publisherVideo == 'true'
              ) {
                self.avOptions.video.reason = 0;
              } else {
                self.avOptions.video.reason = 1;
              }
              let options = {
                audio: self.avOptions.audio.hasAudio,
                video: self.avOptions.video.hasVideo,
                pluginId: response.thisHandleId,
                plugin: self
              };
              self.Events.onAudioVideoPropertyChange.apply(self, [options]);
              self.Events.onStreamSubscribed.apply(self, [
                { response: response, plugin: self }
              ]);
            }
          } catch (e) {}
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `subscribing_stream_ack_${randomNumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `subscribing_stream_ack_${randomNumber.toString()}`,
          ackFunction
        );

        req.Events.onError = function(error) {
          self.Errors.onError.apply(
            self,
            msgCh.cs_proto.Errors.SUBSCRIBE_STREAM_FAILED
          );
        };
      } else {
        this.Errors.onError.apply(
          this,
          msgCh.cs_proto.Errors.SUBSCRIBE_STREAM_FAILED
        );
      }
    },

    initAndAttachToMediaServer: function() {
      let { connectionId } = this.connection;
      let { msgCh } = this.connection;
      let mediaParams = {
        sessionId: connectionId,
        eventParams: { pluginType: this.confInstance.plugin }
      }; //no i18n
      let randomNumber = msgCh.generateRandomNumber(
        'init_videoroom_plugin_subscriber'
      ); //no i18n
      let self = this;

      let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
      let actionSegment = self.msgCh.createActionSegment(
        'INIT_PLUGIN',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(roomId, userId, self.connection.connectionId);
      let action = self.msgCh.createAction(actionSegment, relationalIds);
      self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n
      let req = msgCh.sendReq(
        msgCh.cs_proto.MediaEvents.INIT_PLUGIN,
        'init_videoroom_plugin_subscriber',
        msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n
      let transactionId;
      function respFunction(e) {
        document.removeEventListener(transactionId, respFunction);
        try {
          let response = JSON.parse(e.detail);

          let info = { source: 'FromMSToClient', reponse: response }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'INIT_PLUGIN',
            3,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(roomId, userId, self.connection.connectionId);
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          self.msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n

          if (response.id) {
            self.pluginId = response.id;
            self.bindPluginToMediaServer(self.pluginId);
            self.bindWebrtcEvents(self.pluginId);
            self.join();
            self.confInstance.Events.onCreateVideoElement.apply(self, [self]);
          } else {
            self.Errors.onError.apply(self, [
              msgCh.cs_proto.Errors.INIT_PLUGIN
            ]);
          }
        } catch (error) {
          self.Errors.onError.apply(self, [msgCh.cs_proto.Errors.INIT_PLUGIN]);
        }
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        // ack = ack+""; //TODO:remove this line
        msgCh.documentEventListeners.push(ack.transactionId);
        transactionId = ack.transactionId;
        document.removeEventListener(
          `init_videoroom_plugin_subscriber_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `init_videoroom_plugin_subscriber_ack_${randomNumber.toString()}`,
        ackFunction
      );

      req.Events.onError = function(error) {
        self.Errors.onError.apply(self, msgCh.cs_proto.Errors.INIT_PLUGIN);
      };
    },

    join: function() {
      let { msgCh } = this.connection;
      if (this.pluginId && this.stream) {
        let { connectionId } = this.connection;
        let audioReceive = true;
        let videoReceive = true;
        if (this.webrtcCORE.options) {
          audioReceive = this.webrtcCORE.options.audio === false ? false : true;
          videoReceive = this.webrtcCORE.options.video === false ? false : true;
        }
        let mediaParams = {
          sessionId: connectionId,
          handleId: this.pluginId,
          eventParams: {
            roomId: this.confInstance.roomId,
            streamId: this.stream.id,
            audio: audioReceive,
            video: videoReceive
          }
        }; //no i18n
        let randomnumber = msgCh.generateRandomNumber(
          'map_room_to_plugin/join_a_room_in_plugin_for_subscriber'
        ); //no i18n
        let self = this;

        let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
        let actionSegment = self.msgCh.createActionSegment(
          'MAP_ROOM_TO_PLUGIN',
          1,
          new Date().getTime(),
          info
        ); //no i18n
        let relationalIds = [];
        relationalIds.push(
          roomId,
          userId,
          self.connection.connectionId,
          self.pluginId
        );
        let action = self.msgCh.createAction(actionSegment, relationalIds);
        self.msgCh.createModuleASAndSend(roomId, randomnumber, action); //no i18n
        let req = msgCh.sendReq(
          msgCh.cs_proto.MediaEvents.MAP_ROOM_TO_PLUGIN,
          'map_room_to_plugin/join_a_room_in_plugin_for_subscriber',
          msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
          undefined,
          msgCh.cs_proto.EventPipeLines.MEDIA,
          mediaParams,
          randomnumber
        ); //no i18n
        let transactionId;
        function respFunction(e) {
          document.removeEventListener(transactionId, respFunction);
          try {
            let response = JSON.parse(e.detail);

            let info = { source: 'FromMSToClient', response: response }; //no i18n
            let actionSegment = self.msgCh.createActionSegment(
              'MAP_ROOM_TO_PLUGIN',
              3,
              new Date().getTime(),
              info
            ); //no i18n
            let relationalIds = [];
            relationalIds.push(
              roomId,
              userId,
              self.connection.connectionId,
              self.pluginId
            );
            let action = self.msgCh.createAction(actionSegment, relationalIds);
            let key = {};
            key.type = 0;
            let keyPair = {};
            keyPair[randomnumber] = transactionId;
            key.keyPair = keyPair;
            self.msgCh.createModuleASAndSend(
              roomId,
              transactionId,
              action,
              key
            ); //no i18n

            if (response.id) {
              //Get Id from Response,Id is publisher uniqueId so this id will be used to identify publisher handles later
              self.id = response.id;
              //                                if(!self.confInstance.subscriberHandles[self.id]){
              self.confInstance.subscriberHandles[self.id] = self;
              //                                }
              // self.Events.onInit.apply(self,[self]);
              self.bindStreamToMediaServer();
              self.Events.onJoin.apply(self, [self]);
            } else {
              self.Errors.onError.apply(
                self,
                msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED
              );
            }
          } catch (e) {
            self.Errors.onError.apply(
              self,
              msgCh.cs_proto.Errors.MAP_ROOM_TO_PLUGIN_FAILED
            );
          }
        }
        function ackFunction(evnt) {
          let ack = JSON.parse(evnt.detail);
          msgCh.documentEventListeners.push(ack.transactionId);
          transactionId = ack.transactionId;
          document.removeEventListener(
            `map_room_to_plugin/join_a_room_in_plugin_for_subscriber_ack_${randomnumber.toString()}`,
            ackFunction
          );
          document.addEventListener(transactionId, respFunction);
          media_channel.messages_without_ack.find(o => {
            //possibilty tht the response was received before the ack
            if (o.transactionId == ack.transactionId) {
              let event = new CustomEvent(o.transactionId, {
                detail: o.detail
              }); //no i18n
              document.dispatchEvent(event);
            }
          });
        }
        document.addEventListener(
          `map_room_to_plugin/join_a_room_in_plugin_for_subscriber_ack_${randomnumber.toString()}`,
          ackFunction
        );
      } else {
        this.Errors.onError.apply(
          this,
          msgCh.cs_proto.Errors.NEED_TO_INIT_PLUGIN
        );
      }
    },

    subscribe: function(jsep, options) {
      this.webrtcCORE.options = options;
      if (options && options.audio == true) {
        this.avOptions.audio.hasAudio = true;
        this.avOptions.audio.reason = 0;
        // this.avOptions.audio.hasUserEnabledAudio = true;
        // this.avOptions.audio.hasPublisherEnabledAudio = true;
      }
      if (options && options.video) {
        this.avOptions.video.hasVideo = true;
        this.avOptions.video.reason = 0; //0->both publihser and user has enabled. 1->
        // this.avOptions.audio.hasUserEnabledAudio = true;
        // this.avOptions.audio.hasPublisherEnabledAudio = true;
      }
      if (this.webrtcCORE.mySdp) {
        this.jsep = jsep;
        this.startSubscribing(jsep);
      }
    },

    unsubscribe: function() {
      // if(this.webrtcCORE.webrtcUP = true && this.webrtcCORE.iceState === "connected"){
      let { connectionId } = this.connection;
      let { msgCh } = this.connection;
      let mediaParams = { sessionId: connectionId, handleId: this.pluginId }; //no i18n
      let randomNumber = msgCh.generateRandomNumber('unsubscribing_stream'); //no i18n
      let self = this;

      let info = { source: 'FromClientToMS', mediaParams: mediaParams }; //no i18n
      let actionSegment = self.msgCh.createActionSegment(
        'UNSUBSCRIBE_TO_STREAM',
        1,
        new Date().getTime(),
        info
      ); //no i18n
      let relationalIds = [];
      relationalIds.push(
        roomId,
        userId,
        self.connection.connectionId,
        self.pluginId
      );
      let action = self.msgCh.createAction(actionSegment, relationalIds);
      self.msgCh.createModuleASAndSend(roomId, randomNumber, action); //no i18n

      let req = msgCh.sendReq(
        msgCh.cs_proto.MediaEvents.UNSUBSCRIBE_TO_STREAM,
        'unsubscribing_stream',
        msgCh.cs_proto.ExchangeEndPointTypes.SERVER,
        undefined,
        msgCh.cs_proto.EventPipeLines.MEDIA,
        mediaParams,
        randomNumber
      ); //no i18n
      let transactionId;
      function respFunction(e) {
        document.removeEventListener(transactionId, respFunction);
        try {
          var response = JSON.parse(e.detail);

          let info = { source: 'FromMSToClient', response: response }; //no i18n
          let actionSegment = self.msgCh.createActionSegment(
            'UNSUBSCRIBE_TO_STREAM',
            3,
            new Date().getTime(),
            info
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(
            roomId,
            userId,
            self.connection.connectionId,
            self.pluginId
          );
          let action = self.msgCh.createAction(actionSegment, relationalIds);
          let key = {};
          key.type = 0;
          let keyPair = {};
          keyPair[randomNumber] = transactionId;
          key.keyPair = keyPair;
          self.msgCh.createModuleASAndSend(roomId, transactionId, action, key); //no i18n

          if (response.leaving === 'ok') {
            self.Events.onStreamUnsubscribed.apply(self, [response]);
          } else {
            self.Errors.onError.apply(
              self,
              msgCh.cs_proto.Errors.UNSUBSCRIBE_STREAM_FAILED
            );
          }
        } catch (e) {
          media_channel.Debug.log(
            `Error while processing unpublish stream event response ${response}`
          );
        }
      }
      function ackFunction(evnt) {
        let ack = JSON.parse(evnt.detail);
        msgCh.documentEventListeners.push(ack.transactionId);
        transactionId = ack.transactionId;
        document.removeEventListener(
          `unsubscribing_stream_ack_${randomNumber.toString()}`,
          ackFunction
        );
        document.addEventListener(transactionId, respFunction);
        media_channel.messages_without_ack.find(o => {
          //possibilty tht the response was received before the ack
          if (o.transactionId == ack.transactionId) {
            let event = new CustomEvent(o.transactionId, { detail: o.detail }); //no i18n
            document.dispatchEvent(event);
          }
        });
      }
      document.addEventListener(
        `unsubscribing_stream_ack_${randomNumber.toString()}`,
        ackFunction
      );

      req.Events.onError = function(error) {
        //                    self.Errors.onError.apply(self,msgCh.cs_proto.Errors.UNSUBSCRIBE_STREAM_FAILED);
      };

      return;
    }
    // return false;
    // }
  };

  win.z_user = function(userId, propertyStr, permissionPropertyStr) {
    this.init(userId, propertyStr, permissionPropertyStr);
  };

  z_user.prototype = {
    init: function(userId, propertyStr, permissionPropertyStr) {
      this.userId = userId;
      if (propertyStr && propertyStr.length > 0) {
        let propertyObj = JSON.parse(propertyStr);
        this.appProperty = propertyObj;
      }
      if (permissionPropertyStr) {
        this.permissionProperties = permissionPropertyStr;
      }
    },

    userId: undefined,
    appProperty: undefined,
    statuses: [],
    permissionProperties: undefined,

    updateStatus: function(status, time) {
      this.statuses.push({ status: status, time: time });
    }
  };
}(window));

// isChrome:function(){
//     var userAgent = navigator.userAgent.toLowerCase();
//     return userAgent.indexOf('chrome') > -1 && userAgent.indexOf('opr/') == -1 && navigator.vendor.toLowerCase().search('google') != -1;  //no i18n
// },
// isFirefox:function(){
//     return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
// }
