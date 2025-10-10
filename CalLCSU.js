include("CalGeneral.js")
include("DMM6500.js")
include("TestLCSU.js")
include("Tektronix.js")

var clcsu_RShunt = 0.00025; // сопротивление шунта, Ом
var clcsu_fs = 1000; // частота дискретизации для DMM6500, Гц

var clcsu_ErrShunt = 0.5; // погрешность шунта в %
var clcsu_ErrDMM6500 = 0.0065; // наихудшая погрешность мультиметра в %
var clcsu_NoiseDMM6500 = 0.083; // наихудшая погрешность, вносимая шумами мультиметра, в %

var E0 = 1.1*Math.sqrt((clcsu_ErrShunt*clcsu_ErrShunt) + (clcsu_ErrDMM6500*clcsu_ErrDMM6500) + (clcsu_NoiseDMM6500*clcsu_NoiseDMM6500));

var clcsu_PulseType = 2; // 0 - синус, 1 - модифицированный синус, 2 - трапеция
var clcsu_Iterations = 3; // количество иераций накопления статистики
var clcsu_Points = 10; // кол-во точек калибровки (токов) внутри диапазона калибровки
var clcsu_CurrentRange = 0; // 0 = диапазон [ 70...350 A]; 1 = диапазон [ 350...1100 A]; 2 = диапазон [ 1100...6500 A]


var clcsu_RegulatorProp0 = 0; // переменные записи коэффициентов регуляторов на разные диапазоны
var clcsu_RegulatorIntegral0 = 0;
var clcsu_RegulatorProp1 = 0;
var clcsu_RegulatorIntegral1 = 0;
var clcsu_RegulatorProp2 = 0;
var clcsu_RegulatorIntegral2 = 0;


var LCSU_Range = new Array(6); // массив номеров регистров, задержек и т.д., подробнее см. одноименную функцию ниже

clcsu_IdMin = [160, 351, 1101]; //начальные и конечные значения диапазонов по току
clcsu_IdMax = [350, 1100, 6500];

var clcsu_DMMValues = []; // массив значений измеренных 6500 токов
var clcsu_UnitValues = []; // массив значений измеренных LCSU CtrlBrd токов
var clcsu_DACValues = []; // массив значений ЦАП
var clcsu_ErrSetCurrents = []; // массив отклонений измеренных 6500 значений относительно заданных
var clcsu_ErrTotal = []; // массив значений суммарной ошибки (погрешность задания + погрешность измерения Е0)
var clcsu_ErrMeasCurrents = []; // массив отклонений измеренных блоком значений относительно 6500
var clcsu_CurrentArray_repeat = []; // массив задаваемых токов, повторяемый clcsu_Iterations раз, используется для вывода графика погрешности
var clcsu_SetValuesArray = []; // массив задаваемых токов, распределенных по логарифмическому закону

var clcsu_CurrentCheckCorrect = false; // переменная для цикла проверки корректности полученного от 6500 значения тока
var clcsu_CurrentTemp = 0; // переменная записи тока каждого измерения в цикле

var clcsu_RegulatorError = 0; // переменная проверки ошибки регулятора

function CLCSU_Reset() // обнуление массивов
{
	clcsu_DMMValues=[];
	clcsu_UnitValues=[];
	clcsu_DACValues=[];
	clcsu_ErrSetCurrents=[];
	clcsu_ErrMeasCurrents=[];
	clcsu_ErrTotal=[];
	clcsu_CurrentArray_repeat=[];
	clcsu_CurrentCheckCorrect = false;
	clcsu_CurrentTemp = 0;
}

function CLCSU_CurrentArray(clcsu_CurrentRange,clcsu_Points) // заполнение массива измеряемых значений по логарифмическому закону
{
	clcsu_SetValuesArray = CGEN_GetRangeLogarithm(clcsu_IdMin[clcsu_CurrentRange], clcsu_IdMax[clcsu_CurrentRange], clcsu_Points);
	return clcsu_SetValuesArray;
}

function CLCSU_MeasureSet(Range) // настройка токового диапазона блока
{
	clcsu_CurrentRange = Range;
	CLCSU_Range(clcsu_CurrentRange); // запись номеров регистров, исходя из выбранного диапазона
	return 0;
}

function CLCSU_CollectId6500()
{
	CLCSU_Reset();
	tmc.co();

	var CurrentArray = CLCSU_CurrentArray(clcsu_CurrentRange,clcsu_Points);

	var clcsu_CntTotal = clcsu_Iterations * CurrentArray.length;

	print("Total measurements: " + clcsu_CntTotal);
	print("--------------------");
	for (var i = 0; i < clcsu_Iterations; i++)
	{
		for (var j = 0; j < clcsu_Points; j++) // CurrentArray.length?
		{
			while(clcsu_CurrentCheckCorrect === false)
			{
				if(clcsu_PulseType == 0 || clcsu_PulseType == 1) 
				{
					KEI_Wait();
				}	
				else if(clcsu_PulseType == 2)
				{
					KEI_Voltage(CurrentArray[j]*clcsu_RShunt,clcsu_fs);
				}
				sleep(1000);
				LCSU_Start(clcsu_PulseType, CurrentArray[j]);
				sleep(LCSU_Range[2]);

				if(clcsu_PulseType==0 || clcsu_PulseType==1) // функция для получения максимального значения на синусе или мод.синусе
				{
					clcsu_CurrentTemp = KEI_Current();
				}
				if(clcsu_PulseType==2) // аналогично для трапеции
				{
					clcsu_CurrentTemp = KEI_ReadArrayTrapeze();
				}

				if (clcsu_CurrentTemp > 5)
				{
					clcsu_CurrentCheckCorrect = true;
				}
				else
				{
					print("IdSc, A: " + clcsu_CurrentTemp);
					print("Incorrect measurement. Repeat...");
					print("--------------------");
					if (anykey()) return 0;
				}
				if (anykey()) return 0;
			}

			clcsu_RegulatorError = dev.rf(196);
			if (clcsu_RegulatorError==1)
			{
				print("Following regulator error.");
				dev.c(2);
				sleep(100);
				dev.c(1);
				return 0;
			}

			clcsu_CurrentCheckCorrect = false;

			var Id_DACArray = dev.raff(6);
			var IdDAC = Math.max.apply(null, Id_DACArray); //максимальное значение ЦАП
			var IdUnit = dev.rf(200); // Ток измеренный LCSU CtrlBrd
			var IdSc = clcsu_CurrentTemp; // Ток измеренный DMM6500
			var IdSet = dev.rf(128); // Задаваемый ток
			var IdErrSet = ((IdSc - IdSet) / IdSet * 100); // погрешность измеренного 6500 тока относительно заданного
			var IdErrMeas = ((IdUnit - IdSc) / IdSc * 100); // погрешность измеренного блоком тока относительно измеренного 6500 

			clcsu_DMMValues.push(IdSc);
			clcsu_UnitValues.push(IdUnit);
			clcsu_DACValues.push(IdDAC);
			clcsu_ErrSetCurrents.push(+IdErrSet);
			clcsu_ErrTotal.push(Math.sign_ma(IdErrSet)*(Math.abs(IdErrSet)+E0));

			clcsu_ErrMeasCurrents.push(+IdErrMeas);
			clcsu_CurrentArray_repeat.push(+CurrentArray[j].toFixed(2));

			print("IdSet, A: " + IdSet);
			print("IdSc, A: " + IdSc);
			print("IdErrSet, %: " + IdErrSet);
			print("IdMeasSet, %: " + IdErrMeas);
			print("--------------------");
		}
	}
	return 0; // return clcsu_CurrentArray_repeat, clcsu_UnitValues, clcsu_DMMValues;
}

function CLCSU_CheckRegulatorStatus()
{
	if (dev.rf(44) != 0 || dev.rf(45) != 0 || dev.rf(46) != 0 || dev.rf(47) != 0 || dev.rf(70) != 0 || dev.rf(71) != 0)
		return true;
	else
		return false;
}

function CLCSU_SetADCCoefId(clcsu_adc1, clcsu_adc2, clcsu_adc3)
{
	dev.wf(LCSU_Range[6],clcsu_adc1);
	dev.wf(LCSU_Range[5],clcsu_adc2);
	dev.wf(LCSU_Range[4],clcsu_adc3);

	print("y = Ax^2 + Bx + C");
	print("Coefficient A: " + clcsu_adc3);
	print("Coefficient B: " + clcsu_adc2);
	print("Coefficient C: " + clcsu_adc1);
}

function CLCSU_SetDACCoefId(clcsu_dac1, clcsu_dac2)
{
	dev.wf(LCSU_Range[0], clcsu_dac1);
	dev.wf(LCSU_Range[1], clcsu_dac2);	

	print("y = Ax + B");
	print("Coefficient A: " + clcsu_dac1);
	print("Coefficient B: " + clcsu_dac2);
}


function CLCSU_ResetIdCalADC()
{
	dev.wf(LCSU_Range[6],0);
	dev.wf(LCSU_Range[5],1);
	dev.wf(LCSU_Range[4],0);
}

function CLCSU_CalibrateADC()
{
	CLCSU_ResetIdCalADC();

	CLCSU_CollectId6500();
	CLCSU_PlotGraphs();

	var ADCCoefficients = CGEN_GetNumericCorrection2(clcsu_CurrentArray_repeat,clcsu_DMMValues);

	CLCSU_SetADCCoefId(ADCCoefficients[0], ADCCoefficients[1], ADCCoefficients[2]);
}

function CLCSU_CalibrateDAC()
{

	if(CLCSU_CheckRegulatorStatus())
	{
		p("Regulator is active. DAC calibration unavailable");
		return;
	}

	CLCSU_CollectId6500();

	CLCSU_PlotGraphs();

	var DACCoefficients = CGEN_GetNumericCorrection(clcsu_DMMValues,clcsu_DACValues);

	DACCoefficients[0]=DACCoefficients[0]*LCSU_Range[3]; // меняется в зависимости от кол-ва плат

	CLCSU_SetDACCoefId(DACCoefficients[0], DACCoefficients[1]);

}

function CLCSU_VerifyId6500()
{
	CLCSU_CollectId6500();
	CLCSU_PlotGraphs();
}

function CLCSU_PlotGraphs()
{
	scattern(clcsu_CurrentArray_repeat, clcsu_ErrSetCurrents, "IdSet, A", "IdErrSet, %", "Set error");
	scattern(clcsu_CurrentArray_repeat, clcsu_ErrTotal, "IdSet, A", "ErrTotal, %", "Total (summary) error");
	scattern(clcsu_CurrentArray_repeat, clcsu_ErrMeasCurrents, "IdSet, A", "IdErrMeas, %", "Measure error");
}

function CLCSU_Range(clcsu_CurrentRange) // Служебная функция для определения номера регистров записи коэффициентов и прочего
{
	switch(clcsu_CurrentRange)
	{
		case 0:
			{
				//у диапазонов 1 и 2 смысл переменных аналогичен
				LCSU_Range[0] = 23; // 0 и 1 номера регистров грубой настройки ЦАП
				LCSU_Range[1] = 24;
				LCSU_Range[2] = 500; // задержка между импульсами (мс)
				LCSU_Range[3] = 1; // кол-во задействованных плат
				// y = Ax^2+Bx+C
				LCSU_Range[4] = 34; // тонкая подстройка АЦП, номер регистра квадратичного к-нта A
				LCSU_Range[5] = 35; // тонкая подстройка АЦП, номер регистра линейного к-нта B
				LCSU_Range[6] = 36; // тонкая подстройка АЦП, номер регистра масштабного к-нта C
				break;
			}
		case 1:
			{
				LCSU_Range[0] = 28;
				LCSU_Range[1] = 29;
				LCSU_Range[2] = 2000; 
				LCSU_Range[3] = 6; 
				LCSU_Range[4] = 39;
				LCSU_Range[5] = 40;
				LCSU_Range[6] = 41;
				break;
			}
		case 2:
			{
				LCSU_Range[0] = 67;
				LCSU_Range[1] = 68;
				LCSU_Range[2] = 15000; 
				LCSU_Range[3] = 6; 
				LCSU_Range[4] = 39;
				LCSU_Range[5] = 40;
				LCSU_Range[6] = 41;
				break;
			}
		default:
		{
				print("Incorrect value. 0 = 70...350 A, 1 = 350...1100 A, 2 = 1100...6500 A");
				break;
		}
	}
}

function CLCSU_Regulator(Range, OnOff) // диапазон 0,1,2; вкл (1), выкл (0)
{
	switch(OnOff)
	{
		case 0:
		{
			CLCSU_RegulatorSave(Range);
			dev.wf(53,1);
			print("Regulator off. Range: " +Range);
			break;
		}
		case 1:
		{
			CLCSU_RegulatorCall(Range);
			dev.wf(53,0);
			print("Regulator on. Range: " +Range);
			break;
		}
		default:
		{
			print("Incorrect value");
			break;
		}
	}
}

function CLCSU_RegulatorSave(Range)
{
	switch(Range)
	{
		case 0:
			{
				clcsu_RegulatorProp0 = dev.rf(44);
				clcsu_RegulatorIntegral0 = dev.rf(45);
				dev.wf(44,0);
				dev.wf(45,0);
				break;
			}
		case 1:
			{
				clcsu_RegulatorProp1 = dev.rf(46);
				clcsu_RegulatorIntegral1 = dev.rf(47);
				dev.wf(46,0);
				dev.wf(47,0);
				break;
			}
		case 2:
			{
				clcsu_RegulatorProp2 = dev.rf(70);
				clcsu_RegulatorIntegral2 = dev.rf(71);
				dev.wf(70,0);
				dev.wf(71,0);
				break;
			}
			default:
			{
				print("Incorrect value");
				break;
			}
	}
}
function CLCSU_RegulatorCall(Range)
{
	switch(Range)
	{
		case 0:
			{
				dev.wf(44,clcsu_RegulatorProp0);
				dev.wf(45,clcsu_RegulatorIntegral0);
				break;
			}
		case 1:
			{
				dev.wf(46,clcsu_RegulatorProp1);
				dev.wf(47,clcsu_RegulatorIntegral1);
				break;
			}
		case 2:
			{
				dev.wf(70,clcsu_RegulatorProp2);
				dev.wf(71,clcsu_RegulatorIntegral2);
				break;
			}
			default:
			{
				print("Incorrect value");
				break;
			}
	}
}

///--- Функции для осциллографа Tektronix и иных прочих ---///

function CAL_Init(portDevice, portTek, channelMeasureId)
{
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureId = channelMeasureId;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureId)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}
//--------------------

function CAL_VerifyId()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}
//--------------------
function CAL_CalibrateId()
{		
	CAL_ResetA();
	CAL_ResetIdCal();
	
	// Tektronix init
	CAL_TekInit(cal_chMeasureId);

	// Reload values
	var cal_IdStp = Math.round((cal_IdMax[cal_CurrentRange] - cal_IdMin[cal_CurrentRange]) / (cal_Points - 1));
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LSLPC_Id");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		cal_IdCorr = CGEN_GetCorrection2("LSLPC_Id");
		CAL_SetCoefId(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefId();
	}
}
//-------------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Id = [];

	// Tektronix data
	cal_IdSc = [];

	// Relative error
	cal_IdErr = [];

	// Correction
	cal_IdCorr = [];
}
//--------------------
function CAL_TekInit()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.01");
	TEK_TriggerPulseInit(cal_chMeasureId, "0.04");
	TEK_Horizontal("0.250e-3", "0");
	TEK_Send("measurement:meas" + cal_chMeasureId + ":source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas" + cal_chMeasureId + ":type maximum");
}
//--------------------

function CAL_CollectId(clcsu_DMMValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * clcsu_DMMValues.length;
	cal_CntDone = 1;

	var AvgNum;
	if (cal_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < clcsu_DMMValues.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			LCSU_TekScale(cal_chMeasureId, clcsu_DMMValues[j] * cal_clcsu_RShunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LCSU_Start(clcsu_DMMValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet = dev.r(128);
			cal_Id.push(IdSet);
			print("Idset, A: " + IdSet);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_clcsu_RShunt * 1000000).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr, %: " + IdErr);
			print("--------------------");


			
			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------
function LCSU_TekScale(Channel, Value)
{
	Value = Value / 6;
	TEK_Send("ch" + Channel + ":scale " + Value);
	
	TEK_TriggerPulseInit(cal_chMeasureId, Value * 1);
}
//--------------------

function CAL_Measure(Channel)
{
	return TEK_Measure(Channel);
}
//--------------------

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdErr);
}
//--------------------

function CAL_CollectMesure(clcsu_DMMValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * clcsu_DMMValues.length;
	cal_CntDone = 1;

	var AvgNum;
	if (cal_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < clcsu_DMMValues.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			LCSU_TekScale(cal_chMeasureId, clcsu_DMMValues[j] * cal_clcsu_RShunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LCSU_Start(clcsu_DMMValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet = dev.rf(128);
			cal_Id.push(IdSet);
			print("Idset, A: " + IdSet);

			// Unit data
			var IdMes = dev.rf(200);
			cal_IdMes.push(IdMes);
			print("IdMes, A: " + IdMes);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_clcsu_RShunt * 1000000).toFixed(3);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr, %: " + IdErr);

			var IdErrMes = ((IdMes - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErrMes.push(IdErrMes);
			print("IdMesErr, %: " + IdErrMes);
			print("--------------------");


			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CAL_VerifyMesure()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectMesure(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErrMes, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}
//--------------------
function CAL_CalibrateMesure()
{		
	CAL_ResetA();
	CAL_ResetIdCalMes()
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectMesure(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		cal_IdCorr = CGEN_GetCorrection2("LCSU_Id_fixed");
		CAL_SetCoefIdMes(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefIdMes();
	}
}
//--------------------

function CAL_ResetIdCal()
{
	CAL_SetCoefId(0, 1, 0);
}
//--------------------
function CAL_SetCoefId(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.wf(20, P2);
			dev.wf(21, P1);
			dev.wf(22, P0);
		}
		break;
		
		case 1:
		{
			dev.wf(25, P2);
			dev.wf(26, P1);
			dev.wf(27, P0);
		}
		break;
	}		
}
//--------------------
function CAL_PrintCoefId()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id 0 P2	: " + dev.rf(20));
			print("Id 0 P1	: " + dev.rf(21));
			print("Id 0 P0	: " + dev.rf(22));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2	: " + dev.rf(25));
			print("Id 1 P1	: " + dev.rf(26));
			print("Id 1 P0	: " + dev.rf(27));
		}
		break
	}
}
//--------------------
function CAL_SetCoefIdMes(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.wf(34, P2);
			dev.wf(35, P1);
			dev.wf(36, P0);
		}
		break;
		
		case 1:
		{
			dev.wf(39, P2);
			dev.wf(40, P1);
			dev.wf(41, P0);
		}
		break;
	}		
}
//--------------------

function CAL_ResetIdCalMes()
{
	CAL_SetCoefIdMes(0, 1, 0);
}
//--------------------
function CAL_PrintCoefIdMes()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id 0 P2	: " + dev.rf(34));
			print("Id 0 P1	: " + dev.rf(35));
			print("Id 0 P0	: " + dev.rf(36));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2	: " + dev.rf(39));
			print("Id 1 P1	: " + dev.rf(40));
			print("Id 1 P0	: " + dev.rf(41));
		}
		break
	}
}