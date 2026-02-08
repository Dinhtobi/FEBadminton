export const formatDateVi = (date: Date | string | null | undefined): string => {
    if (!date) return "";

    const parsedDate = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(parsedDate.getTime())) return ""; // Kiểm tra date không hợp lệ

    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh', // luôn dùng múi giờ Việt Nam
        weekday: 'long',              // Thứ mấy
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsedDate);
};
