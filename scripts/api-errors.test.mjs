import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, describeUnhandledError, getApiErrorMessage } from '../src/api/core/errors.ts'

test('the host reason is shown whether it is sent as message or msg', () => {
  assert.equal(getApiErrorMessage(new ApiError('Bad Request', 400, { message: ' 权限列表格式不对 ' }), '保存失败'), '权限列表格式不对')
  assert.equal(getApiErrorMessage(new ApiError('Bad Request', 400, { ok: false, msg: '权限列表格式不对' }), '保存失败'), '权限列表格式不对')
})

test('a bare error code or status never surfaces as "Bad Request"', () => {
  assert.equal(getApiErrorMessage(new ApiError('Not Found', 404, { error: 'adapter_not_found' }), '操作失败'), '未找到该适配器')
  assert.equal(getApiErrorMessage(new ApiError('Bad Request', 400, { ok: false }), '配置保存失败'), '配置保存失败（HTTP 400）')
  assert.equal(getApiErrorMessage(new ApiError('Bad Gateway', 502, '<html>bad gateway</html>'), '读取失败'), '读取失败（HTTP 502）')
  assert.equal(getApiErrorMessage(new ApiError('Bad Request', 400, '格式错误'), '读取失败'), '格式错误')
})

test('an unreachable host is named as such', () => {
  assert.match(getApiErrorMessage(new TypeError('Failed to fetch'), '读取失败'), /^读取失败：无法连接宿主/)
})

test('a request failure nobody handled is still reported, with the host reason', () => {
  assert.equal(describeUnhandledError(new ApiError('Internal Server Error', 500, { code: 'internal_error', message: '宿主处理请求时出错: 配置文件被占用' })), '宿主处理请求时出错: 配置文件被占用')
  assert.equal(describeUnhandledError(new ApiError('Internal Server Error', 500, null)), '请求失败（HTTP 500）')
  assert.match(describeUnhandledError(new TypeError('Failed to fetch')), /无法连接宿主/)
})

test('dismissed dialogs, aborted requests, expired keys and plain bugs stay out of the toast', () => {
  assert.equal(describeUnhandledError('cancel'), null)
  assert.equal(describeUnhandledError(new DOMException('aborted', 'AbortError')), null)
  assert.equal(describeUnhandledError(new ApiError('Unauthorized', 401, null)), null)
  assert.equal(describeUnhandledError(new TypeError("Cannot read properties of undefined (reading 'id')")), null)
})
