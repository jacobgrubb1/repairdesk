import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    api.get(`/auth/verify-email/${token}`)
      .then(() => {
        navigate('/login?verified=true');
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
      });
  }, [token, navigate]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">RepairDesk</h1>
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
            Check your email for a verification link to activate your account.
          </div>
          <p className="text-sm text-gray-500 mt-4">
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">RepairDesk</h1>
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
          <p className="text-sm text-gray-500 mt-4">
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">RepairDesk</h1>
        <p className="text-gray-500">Verifying your email...</p>
      </div>
    </div>
  );
}
