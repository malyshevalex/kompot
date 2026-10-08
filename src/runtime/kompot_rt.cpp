// Линкуется к каждому решению: при выходе записывает пик памяти процесса (в КБ)
// в файл из переменной окружения KOMPOT_MEM_FILE. На код ученика не влияет.
#include <cstdio>
#include <cstdlib>
#ifdef _WIN32
#include <windows.h>
#include <psapi.h>
#else
#include <sys/resource.h>
#endif

namespace {
void kompot_report_memory() {
    const char *path = std::getenv("KOMPOT_MEM_FILE");
    if (!path) {
        return;
    }
    long long kb = 0;
#ifdef _WIN32
    PROCESS_MEMORY_COUNTERS pmc;
    if (GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc))) {
        kb = (long long)pmc.PeakPagefileUsage / 1024;  // выделенная процессом память, как считают проверяющие системы
    }
#else
    struct rusage ru;
    getrusage(RUSAGE_SELF, &ru);
#ifdef __APPLE__
    kb = ru.ru_maxrss / 1024;  // на macOS — в байтах
#else
    kb = ru.ru_maxrss;  // на Linux — в КБ
#endif
#endif
    if (FILE *f = std::fopen(path, "w")) {
        std::fprintf(f, "%lld", kb);
        std::fclose(f);
    }
}

struct Registrar {
    Registrar() {
        // В отладке вывод без буфера: текст появляется сразу, даже при пошаговом выполнении
        if (std::getenv("KOMPOT_UNBUFFERED")) {
            std::setvbuf(stdout, nullptr, _IONBF, 0);
        }
#ifdef _WIN32
        // Отладка на Windows: программу запускает Kompot со своими каналами ввода-вывода, а lldb подключается к ней.
        // До main ждём, пока отладчик подключится (не дольше 20 с), чтобы не проскочить точки останова.
        if (std::getenv("KOMPOT_WAIT_DEBUGGER")) {
            for (int i = 0; i < 2000 && !IsDebuggerPresent(); i++) {
                Sleep(10);
            }
        }
#endif
        std::atexit(kompot_report_memory);
    }
} registrar;
}  // namespace
