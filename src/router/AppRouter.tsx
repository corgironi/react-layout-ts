import { RouterProvider } from 'react-router';
import { router } from './routes';

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter; 