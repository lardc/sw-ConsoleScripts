//Команды SCPC
ACT_DS_NONE                             = 1;               //Переход в состояние ожидания
ACT_BAT_START_CHARGE                    = 2;               //Команда блоку SCPowerCell на заряд батареи конденсаторов
ACT_FAULT_CLEAR                         = 3;               //Очистка fault
ACT_WARNING_CLEAR                       = 4;               //Очистка warning
ACT_RESET_DEVICE                        = 5;               //Перезапуск процессора
//-----------
ACT_SC_PULSE_CONFIG                     = 100;             //Команда блоку SCPowerCell на конфигурацию значения ударного тока
ACT_SC_PULSE_START                      = 101;             //Запуск формирования импульса ударного тока
//

//Регистры SCPC
REG_PULSE_OFFSET_VALUE                  = 0;               //Значение смещения сигнала импульса ударного тока (сигнал с ЦАПа)
REG_REGULATOR_OFFSET_VALUE              = 1;               //Значение смещения сигнала регулятора
REG_BAT_VOLTAGE_COEF                    = 2;               //Калибровочный коэффициент напряжения конденсаторной батареи
REG_BAT_VOLTAGE_THRESHOLD               = 3;               //Порог заряда конденсаторной батареи
REG_SC_PULSE_COEF                       = 4;               //Калибровочный коэффициент амплитуды импульса ударного тока
REG_REGULATOR_OFFSET_VAR                = 5;               //Коэффициент изменения значения REGULATOR_OFFSET_VALUE, от амплитуды импульса тока
//---------------
REG_SC_PULSE_VALUE                      = 64;              //Значение амплитуды импульса ударного тока, Ампер
REG_WAVEFORM_TYPE                       = 65;              //Задание формы ударного тока (полусинус/трапеция)
REG_TRAPEZE_EDGE_TIME                   = 66;              //Время длительности фронта трапеции, мкС
REG_TEST_REGULATOR						= 67;			   //Режим работы блока: 1-тест регулятора, 2-обычный режим
//---------------
REG_BAT_VOLTAGE                         = 96;              //Напряжение на конденсаторной батарее, Вольт
REG_DEV_STATE                           = 97;              //Статус работы блока
REG_FAULT_REASON                        = 98;
REG_DISABLE_REASON                      = 99;
REG_WARNING                             = 100;
REG_PROBLEM                             = 101;
//---------------
//

//Ошибки SCPC
ERR_SYNC_TIMEOUT                        = 1;               //Превышено время нахождения линии SYNC в высоком состоянии
ERR_SC_PULSE_VALUE                      = 2;               //Неправильное значение установленного тока
ERR_UNIT_NOT_CONFIGURED                 = 3;               //Блок не сконфигурирован под заданное значение ударного тока
//

//Предупреждения SCPC
WARNING_UINIT_NOT_READY                 = 1;               //Блок еще не готов к работе
//

//Состояние блока
DS_None               					= 0;               //Блок в неопределенном состоянии
DS_Fault              					= 1;               //Блок в состоянии Fault
DS_Disabled           					= 2;               //Блок в состоянии Disabled
DS_WaitTimeOut        					= 3;               //Блок в ожидании таймаута между импульсами ударного тока
DS_BatteryChargeWait  					= 4;               //Блок в состоянии ожидания заряда конденсаторной батареи
DS_Ready              					= 5;               //Блок в состоянии готовности
DS_PulseConfigReady   					= 6;               //Блок в в сконфигурированном состоянии
DS_PulseStart         					= 7;               //Блок в состоянии формирования импульса ударного тока
DS_PulseEnd           					= 8;               //Блок завершил формирование импульса тока  
//

//Параметры блока по умолчанию
WAVEFORM_SINE    						= 0xAAAA;			//Тип формы импульса синус
WAVEFORM_TRAPEZE  						= 0xBBBB;			//Тип формы импульса трапеция
//


//-----------------------------------------------------------
function SC(Current,WaveForm,TrapezeEdgeTime)
{
	//Заряд батареи
	if(dev.r(REG_DEV_STATE)==DS_None)
	{
		dev.c(ACT_BAT_START_CHARGE);
	}
	
	while(dev.r(REG_DEV_STATE)!=DS_Ready){if(Print_FaultDisableWarning()){return;}}

	//Запись значения ударного тока
	dev.w(REG_SC_PULSE_VALUE, Current);
	dev.w(REG_WAVEFORM_TYPE, WaveForm);
	dev.w(REG_TRAPEZE_EDGE_TIME, TrapezeEdgeTime);
	dev.c(ACT_SC_PULSE_CONFIG);
	while(dev.r(REG_DEV_STATE)!=DS_PulseConfigReady)
	{
		sleep(1000);
		if(Print_FaultDisableWarning()){return;}
	}
	
	//Формирование ударного тока
	dev.c(ACT_SC_PULSE_START);
	sleep(20);
	while(dev.r(REG_DEV_STATE)!=DS_PulseEnd)
	{
		if(Print_FaultDisableWarning()){return;}
	}
	print("Done.");
}

//-----------------------------------------------------------


//-----------------------------------------------------------
function SC_Sine(Current, ShowGraph)
{
	SC(Current,WAVEFORM_SINE,1000);
	
	if(ShowGraph)
	{
		a=dev.rafs(1);
		plot(a,1,1);
	}
}
//-----------------------------------------------------------


//-----------------------------------------------------------
function SC_Trapeze(Current, EdgeTime)
{
	SC(Current,WAVEFORM_TRAPEZE,EdgeTime);
	
	a=dev.rafs(1);
	plot(a,1,1);
}
//-----------------------------------------------------------


//-----------------------------------------------------------
function SC_PulseSycle(Current, PulseNumber)
{
	for(var i=1;i<=PulseNumber;i++)
	{
		print("PulseNumber="+i);
		SC(Current);
	}
}
//-----------------------------------------------------------


//-----------------------------------------------------------
function SCPC_Info()
{
	Status = dev.r(REG_DEV_STATE);
	Fault = dev.r(REG_FAULT_REASON);
	Disable = dev.r(REG_DISABLE_REASON);
	Warning = dev.r(REG_WARNING);
	BatVoltage = dev.r(REG_BAT_VOLTAGE);
	
	print("Status     = " + Status);
	print("Fault      = " + Fault);
	print("Disable    = " + Disable);
	print("Warning    = " + Warning);
	print("BatVoltage = " + BatVoltage);
}
//------------------------------------------------------------


//-----------------------------------------------------------
function Print_FaultDisableWarning()
{
	if((dev.r(REG_DEV_STATE)==DS_Fault))
	{
		switch(dev.r(REG_FAULT_REASON))
		{
			case ERR_SYNC_TIMEOUT:
			{
				print("Fault=ERR_SYNC_TIMEOUT");
			}
			case ERR_SC_PULSE_VALUE:
			{
				print("Fault=ERR_SC_PULSE_VALUE");
			}
			case ERR_UNIT_NOT_CONFIGURED:
			{
				print("Fault=ERR_UNIT_NOT_CONFIGURED");
			}
		}
		return 1;
	}
//---------------	
	if(dev.r(REG_DEV_STATE)==DS_Disabled)
	{
		print("Disable="+dev.r(REG_DISABLE_REASON));
		return 1;
	}
//--------------	
	if(dev.r(REG_WARNING)==DS_Disabled)
	{
		if(dev.r(REG_WARNING)==WARNING_UINIT_NOT_READY)
		{
			print("Disable=WARNING_UINIT_NOT_READY");
		}
		else
		{
			print("Disable=Unknow");
		}
	}	
//-------------
	return 0;
}
//------------------------------------------------------------


//-----------------------------------------------------------
function TestSine(Current)
{
	dev.w(REG_TEST_REGULATOR,1);//Режим теста регулятора включен
	
	SC(Current,WAVEFORM_SINE,100);
	a=dev.rafs(1);
	plot(a,1,1);
}
//-----------------------------------------------------------


//-----------------------------------------------------------
function TestTrap(Current,EdgeTime)
{
	dev.w(REG_TEST_REGULATOR,1);//Режим теста регулятора включен
	
	SC(Current,WAVEFORM_TRAPEZE,EdgeTime);
	a=dev.rafs(1);
	plot(a,1,1);
}
//-----------------------------------------------------------

function REG_Read()
{
	print("Reg 0  = "+dev.r(0));
	print("Reg 1  = "+dev.r(1));
	print("Reg 2  = "+dev.r(2));
	print("Reg 4  = "+dev.r(4));
	print("Reg 5  = "+dev.r(5));
	print("Reg 6  = "+dev.r(6));
	print("Reg 7  = "+dev.r(7));
	print("Reg 8  = "+dev.r(8));
	print("Reg 9  = "+dev.r(9));
	print("Reg 10 = "+dev.r(10));
	print("Reg 11 = "+dev.r(11));
}