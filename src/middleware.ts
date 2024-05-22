import { withAuth } from "next-auth/middleware";

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      return (
        !!token?.login && dashboardUsers.includes(token.login.toLowerCase())
      );
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
