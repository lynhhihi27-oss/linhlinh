// Bản tối giản của `next/server`, đủ cho các route handler của dự án.
export const NextResponse = {
  json(body, init) {
    return Response.json(body, init);
  },
};
