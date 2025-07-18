include("CalGeneral.js")
include("6500.js")
include("TestLCSU.js")

PulseType = 0; // 0 - синус, 1 - модифицированный синус, 2 - трапеция

// Calibration setup parameters
clcsu_Rshunt = 250;	// мкОм

// Обозначение диапазонов калибровки
clcsu_CurrentRange = 0; // 0 = диапазон [ <= 350 A]; 1 = диапазон [ < 1100 A]; 2 = диапазон [ < 6500 A]
var LCSU_Range = new Array(1); // массив номеров регистров К и B для разных диапазонов
CLCSU_Range(clcsu_CurrentRange); 
//
clcsu_Points = 3; // кол-во точек калибровки (токов) внутри диапазона калибровки
//
clcsu_IdMin = [160, 351, 1101];
clcsu_IdMax = [699, 1099, 6500]; // должно быть [349, 1099, 6500] в новой прошивке, значение 699 взято для тестов на 2-диапазонном блоке!
clcsu_IdStp = (clcsu_IdMax[clcsu_CurrentRange] - clcsu_IdMin[clcsu_CurrentRange]) / clcsu_Points;
//
clcsu_Iterations = 5; // количество итераций накопления статистики
clcsu_SaveImage = 0;

function CLCSU_VerifyId()
{		

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(clcsu_IdMin[clcsu_CurrentRange], clcsu_IdMax[clcsu_CurrentRange], clcsu_Points);

	if (CLCSU_CollectId(CurrentArray, clcsu_Iterations))
	{
		CLSLPC_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(clcsu_IdSc, clcsu_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error "
				+ clcsu_IdMin[clslpc_CurrentRange] + " A ... " + clcsu_IdMax[clslpc_CurrentRange] + " A");
		scattern(clcsu_IdSc, clcsu_IdUnitErr, "Current (in A)", "Error (in %)", "Current unit relative error "
				+ clcsu_IdMin[clcsu_CurrentRange] + " A ... " + clcsu_IdMax[clslpc_CurrentRange] + " A");
	}
}

function CLCSU_CollectId(CurrentArray, clcsu_Iterations, PulseType)
{
	clcsu_CntTotal = clcsu_Iterations * CurrentArray.length;
	//clcsu_CntDone = 1;
	print("Кол-во итераций: " + clcsu_CntTotal);

	var CurrentValues = new Array(clcsu_CntTotal); // массив значений измеренных токов
	var DACValues = new Array(clcsu_CntTotal); // массив значений ЦАП
	var deltaCurrents = new Array(clcsu_CntTotal); // массив отклонений измеренных LCSU CtrlBrd значений от измеренных 6500
	var CurrentArray_repeat = new Array(clcsu_CntTotal); // массив задаваемых токов, повторяемый clcsu_Iterations раз, используется для вывода графика погрешности
	var sum_Current_square = 0, sum_Current  = 0, sum_DAC = 0, sum_Common = 0; // коэффициенты для расчета аппроксимационной прямой

	for (var i = 0; i < clcsu_Iterations; i++)
	{
		for (var j = 0; j < CurrentArray.length; j++)
		{
			KEI_Wait();
			sleep(1500);
			LCSU_Start(PulseType, CurrentArray[j]);
			sleep(200);

			Id_DACArray = dev.raff(6);
			var IdDAC = Math.max.apply(null, Id_DACArray);

			var IdUnit = dev.rf(200); // Ток измеренный LCSU CtrlBrd
			var IdSc = KEI_Current(); // Ток измеренный DMM6500, он же realCurrent в старом скрипте
			var IdSet = dev.rf(128); // Задаваемый ток, он же Current_actual в старом скрипте
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2); // погрешность заданного тока относительно измеренного dmm6500
			//clcsu_Id.push(IdSet);
			//clcsu_IdSc.push(IdSc);
			//clcsu_IdErr.push(IdErr);
			sum_Current_square += (IdSc*IdSc);
			sum_Current +=IdSc;
			sum_DAC += IdDAC;
			sum_Common += IdSc*IdDAC;

			CurrentValues[(i*CurrentValues.length)+j] = IdSc;
			DACValues[(i*CurrentValues.length)+j] = IdDAC;
			deltaCurrents[(i*CurrentValues.length)+j] = IdErr;
			CurrentArray_repeat[(i*CurrentValues.length)+j] = CurrentArray[j];

			print("Значение выхода ЦАП: " + IdDAC);
			print("Заданный ток, A: " + IdSet);
			print("Измеренный мультиметром ток, A: " + IdSc);
			print("Измеренный LCSU CtrlBrd ток, A: " + IdUnit);
			print("Погрешность LCSU CtrlBrd относительно DMM6500, %: " + IdErr);
			print("--------------------");
		}
	}
	scattern(CurrentArray_repeat, deltaCurrents, "Заданный ток, А", "Отклонение, %", "Отклонение измеренного тока от заданного, 160...700 А");
	CLCSU_CalibrateDAC(sum_Current_square, sum_Current, sum_DAC, sum_Common, clcsu_CntTotal, clcsu_CntTotal);
}

function CLCSU_CalibrateDAC(sum_Current_square, sum_Current, sum_DAC, sum_Common, clcsu_CntTotal, clcsu_CntTotal)
{
	var coeff_n1 = sum_Current_square*sum_DAC/sum_Current;
	var coeff_b1 = sum_Current_square*(-(clcsu_CntTotal))/sum_Current;
	var coeff_b2 = coeff_b1+sum_Current;
	var coeff_n2 = sum_Common - coeff_n1;
	var CLCSU_B = coeff_n2/coeff_b2;
	var CLCSU_K = (sum_DAC-(clcsu_CntTotal*CLCSU_B))/sum_Current;
	p("Коэффициент К: " + CLCSU_K);
	p("Коэффициент B: " + CLCSU_B);
	sum_Current_square = 0, sum_Current  = 0, sum_DAC = 0, sum_Common = 0;

	if (CLCSU_K < 0.01 || CLCSU_K > 5 || CLCSU_B<500 || CLCSU_B>2000)
		{
			p("Коэффициенты абсолютно точно неправильны. Пожалуйста, проведите расчет снова. Записаны дефолтные коэффициенты");
			dev.wf(LCSU_Range[0],2.2);
			dev.wf(LCSU_Range[1],1000);	
		}
		else 
		{
			p("Коэффициенты записаны. Не забывайте про команду dev.c(200) для записи в энергонезависимую память");
			dev.wf(LCSU_Range[0],CLCSU_K);
			dev.wf(LCSU_Range[1],CLCSU_B);	
		}
}

function CLCSU_Range(clcsu_CurrentRange) // Функция для определения номера регистров записи коэффициентов
{
	if (clcsu_CurrentRange === 0) // 160...350 A
	{
		LCSU_Range[0] = 23; // номера регистров
		LCSU_Range[1] = 24;
	}
	if (clcsu_CurrentRange = 1) //350...1100 A
		{
			LCSU_Range[0] = 28;
			LCSU_Range[1] = 29;
		}
	if (clcsu_CurrentRange === 2) // 1100... 6500 A
		{
			LCSU_Range[0] = 67;
			LCSU_Range[1] = 68;
		}	
}