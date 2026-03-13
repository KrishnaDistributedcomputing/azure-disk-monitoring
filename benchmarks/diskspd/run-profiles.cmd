REM ============================================================================
REM DiskSpd Benchmark Profiles for Windows VMs
REM ============================================================================
REM Usage: Run from C:\Benchmarks\DiskSpd\amd64\ directory
REM Target: Create test file first — fsutil file createnew F:\iotest.dat 10737418240
REM ============================================================================

REM --- Sequential Read 1M ---
REM diskspd -b1M -o32 -t4 -r -d120 -Sh -D -L -c10G F:\iotest.dat > C:\Benchmarks\results\seq-read-1m.txt

REM --- Sequential Write 1M ---
REM diskspd -b1M -o32 -t4 -r -w100 -d120 -Sh -D -L -c10G F:\iotest.dat > C:\Benchmarks\results\seq-write-1m.txt

REM --- Random Read 4K ---
REM diskspd -b4K -o64 -t4 -r -d120 -Sh -D -L -c10G F:\iotest.dat > C:\Benchmarks\results\rand-read-4k.txt

REM --- Random Write 4K ---
REM diskspd -b4K -o64 -t4 -r -w100 -d120 -Sh -D -L -c10G F:\iotest.dat > C:\Benchmarks\results\rand-write-4k.txt

REM --- Mixed 70/30 Read/Write 4K ---
REM diskspd -b4K -o32 -t4 -r -w30 -d120 -Sh -D -L -c10G F:\iotest.dat > C:\Benchmarks\results\rand-rw-70-30.txt

REM --- Latency Probe (low QD) ---
REM diskspd -b4K -o1 -t1 -r -d60 -Sh -D -L -c10G F:\iotest.dat > C:\Benchmarks\results\lat-probe-4k.txt
