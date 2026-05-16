// Simple form validation utilities
export interface ValidationError {
  field: string
  message: string
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  phone: string
  gender: 'male' | 'female' | 'other'
  pb: string
  password: string
  confirmPassword: string
}

export function validateEmail(email: string): ValidationError | null {
  if (!email) {
    return { field: 'email', message: '请输入邮箱' }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { field: 'email', message: '邮箱格式不正确' }
  }
  return null
}

export function validatePassword(password: string): ValidationError | null {
  if (!password) {
    return { field: 'password', message: '请输入密码' }
  }
  if (password.length < 6) {
    return { field: 'password', message: '密码至少6个字符' }
  }
  return null
}

export function validatePhone(phone: string): ValidationError | null {
  if (!phone) {
    return { field: 'phone', message: '请输入手机号' }
  }
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phone)) {
    return { field: 'phone', message: '手机号格式不正确' }
  }
  return null
}

export function validateName(name: string): ValidationError | null {
  if (!name) {
    return { field: 'name', message: '请输入姓名' }
  }
  if (name.length < 2) {
    return { field: 'name', message: '姓名至少2个字符' }
  }
  return null
}

export function validateLoginForm(data: LoginFormData): ValidationError[] {
  const errors: ValidationError[] = []

  const emailError = validateEmail(data.email)
  if (emailError) errors.push(emailError)

  const passwordError = validatePassword(data.password)
  if (passwordError) errors.push(passwordError)

  return errors
}

export function validateRegisterForm(data: RegisterFormData): ValidationError[] {
  const errors: ValidationError[] = []

  const nameError = validateName(data.name)
  if (nameError) errors.push(nameError)

  const emailError = validateEmail(data.email)
  if (emailError) errors.push(emailError)

  const phoneError = validatePhone(data.phone)
  if (phoneError) errors.push(phoneError)

  if (!data.gender) {
    errors.push({ field: 'gender', message: '请选择性别' })
  }

  if (!data.pb) {
    errors.push({ field: 'pb', message: '请输入PB成绩' })
  }

  const passwordError = validatePassword(data.password)
  if (passwordError) errors.push(passwordError)

  if (data.password !== data.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: '两次密码不一致' })
  }

  return errors
}
