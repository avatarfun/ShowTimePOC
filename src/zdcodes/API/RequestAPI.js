/*$Id$*/

const RequestAPI = function(url, isInternal, featureFlags, extraHeaders) {
  let core = {
    ajax: function(method, url, args, payload, files) {
      return new Promise((resolve, reject) => {
        let client = new XMLHttpRequest();
        let uri = url;
        var data = '';
        if (
          args &&
          (method === 'POST' || method === 'PUT' || method === 'PATCH')
        ) {
          let argcount = 0;
          for (let key in args) {
            if (args.hasOwnProperty(key)) {
              if (argcount++) {
                data += '&';
              }
              data += `${encodeURIComponent(key)}=${encodeURIComponent(
                args[key]
              )}`;
            }
          }
        }
        client.open(method, uri);
        // client.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        // client.setRequestHeader('orgId', SupportUI.CurrentPortal.zgid);
        // client.setRequestHeader('Access-Control-Allow-Headers', '*');
        // if (isInternal) {
        //   client.setRequestHeader('AccessInternalParam', 'true');
        // }
        // if (featureFlags) {
        //   client.setRequestHeader('featureFlags', featureFlags);
        // }
        // if (extraHeaders && typeof extraHeaders === 'object') {
        //   Object.keys(extraHeaders).forEach(key => {
        //     client.setRequestHeader(key, extraHeaders[key]);
        //   });
        // }
        // client.setRequestHeader(
        //   'X-ZCSRF-TOKEN',
        //   `crmcsrfparam=${getCSRFCookie()}`
        // );

        if (files) {
          var data = new FormData();
          if (files.length != 0) {
            for (let i = 0, len = files.length; i < len; i++) {
              data.append('file', files[i]);
            }
          }
          client.send(data);
        } else if (payload) {
          client.setRequestHeader(
            'Content-Type',
            'application/json;charset=UTF-8'
          );
          client.send(payload);
        } else {
          client.setRequestHeader(
            'Content-Type',
            'application/x-www-form-urlencoded'
          );
          client.send(data);
        }

        client.onload = function() {
          if (
            this.status === 200 ||
            this.status === 201 ||
            this.status === 204
          ) {
            let response = this.response ? this.response : this.responseText;
            if (response === '') {
              resolve({ responseStatus: this.status });
            } else {
              try {
                if (JSON.parse(response)) {
                  resolve(JSON.parse(response));
                }
              } catch (e) {
                resolve(response);
              }
            }
          } else {
            reject(this);
          }
        };
        client.onerror = function(e) {
          reject(this);
        };
      });
    }
  };

  return {
    get: function() {
      return core.ajax('GET', url);
    },
    post: function(args, payload) {
      return core.ajax('POST', url, args, payload);
    },
    patch: function(args, payload, files) {
      return core.ajax('PATCH', url, args, payload, files);
    },
    put: function(args, payload, files) {
      return core.ajax('PUT', url, args, payload, files);
    },
    del: function() {
      return core.ajax('DELETE', url);
    },
    attach: function(files, onProcess) {
      return core.ajax('POST', url, {}, undefined, files);
    }
  };
};
// function getCSRFCookie() {
//   let csrfToken = get_cookie('crmcsr'); //NO I18N
//   return csrfToken;
// }
// function get_cookie(cookie_name) {
//   let results = document && document.cookie.match(`${cookie_name}=(.*?)(;|$)`);
//   if (results) {
//     return unescape(results[1]);
//   }
//   return null;
// }

export default RequestAPI;
