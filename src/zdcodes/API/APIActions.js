import RequestAPI from './RequestAPI';
const providerDomain = 'https://showtimeconf.csez.zohocorpin.com:8443';

/**
 * @param {*} roomId
 */
export function createRoom(roomId) {
  //{"roomId":"1554708497986"}

  const actionUrl = `${providerDomain}/roomkey/${roomId}`;
  return RequestAPI(actionUrl).get();
}
/**
 * @param {*} roomId
 * @param {*} payload
 */
export function createUser(roomId, payload) {
  const actionUrl = `${providerDomain}/roomaction/${roomId}/user/create`;
  return RequestAPI(actionUrl).post('', payload);
}
export function getUser(roomId, userId) {
  const actionUrl = `${providerDomain}/roomaction/${roomId}/user/${userId}`;
  return RequestAPI(actionUrl).get();
}
export function deleteUser(roomId, userId) {
  const actionUrl = `${providerDomain}/roomaction/${roomId}/user/delete/${userId}`;
  return RequestAPI(actionUrl).post();
}
