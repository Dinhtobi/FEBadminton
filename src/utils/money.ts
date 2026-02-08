export const splitFeeEvenlyInt = (total: number, count: number): number[] => {
    if (count === 0) return [];

    const base = Math.floor(total / count); // chia đều, làm tròn xuống
    const result = Array(count).fill(base);

    let remaining = total - base * count; // số tiền còn dư

    // phân bổ số dư cho một số người đầu tiên
    for (let i = 0; i < remaining; i++) {
        result[i] += 1;
    }

    return result;
}