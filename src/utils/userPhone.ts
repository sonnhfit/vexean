import { AuthUser } from '../store/authSlice';

const PHONE_PATTERN = /^(?:\+?84|0)\d{8,10}$/;

function normalizePhone(value: string | undefined) {
  const compact = value?.replace(/[\s.-]/g, '');
  if (!compact || !PHONE_PATTERN.test(compact)) {
    return '';
  }

  return compact;
}

export function getLinkedPhoneNumber(user: AuthUser | null | undefined) {
  if (!user) {
    return '';
  }

  return (
    normalizePhone(user.user_role?.phone_number) ||
    normalizePhone(user.user_role?.phone) ||
    normalizePhone(user.employee?.phone_number) ||
    normalizePhone(user.employee?.phone) ||
    normalizePhone(user.phone_number) ||
    normalizePhone(user.username)
  );
}

export function isUsernamePhoneNumber(user: AuthUser | null | undefined) {
  return Boolean(normalizePhone(user?.username));
}
