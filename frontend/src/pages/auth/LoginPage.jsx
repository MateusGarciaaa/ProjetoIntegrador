import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { DemoAccountsHint } from '../../components/auth/DemoAccountsHint';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { env } from '../../config/env';
import { ROUTE_PATHS } from '../../routes/routePaths';
import { EMPTY_LOGIN_FORM, validateLoginForm } from './loginFormSchema';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { values, errors, setFieldValue, validateForm } = useForm({
    initialValues: EMPTY_LOGIN_FORM,
    validate: validateLoginForm,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleChange = (event) => setFieldValue(event.target.name, event.target.value);

  function fillCredentials(credentials) {
    setFieldValue('email', credentials.email);
    setFieldValue('password', credentials.password);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await login(values);
      navigate(location.state?.from?.pathname ?? ROUTE_PATHS.HOME, { replace: true });
    } catch (error) {
      setFormError(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className={styles.title}>Entrar</h1>
      <p className={styles.subtitle}>Use o e-mail e a senha cadastrados pelo administrador da igreja.</p>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="username"
          value={values.email}
          error={errors.email}
          onChange={handleChange}
          autoFocus
        />

        <div className={styles.passwordField}>
          <TextField
            label="Senha"
            name="password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            value={values.password}
            error={errors.password}
            onChange={handleChange}
          />
          <Button
            variant="ghost"
            icon={isPasswordVisible ? 'eyeOff' : 'eye'}
            iconOnly
            className={styles.passwordToggle}
            aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
          />
        </div>

        <Button type="submit" isLoading={isSubmitting} className={styles.submit}>
          Entrar
        </Button>
      </form>

      {env.useMockApi && <DemoAccountsHint onSelect={fillCredentials} />}
    </AuthLayout>
  );
}
