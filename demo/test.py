strlayout = 'qwertyuiopasdfghjkl;zxcvbnm,.?'

arr1 = strlayout[:10]
arr2 = strlayout[10:20]
arr3 = strlayout[20:]
op = ''
for i in range(len(arr1)):
    op += arr1[i] + arr2[i] + arr3[i]

print(op)